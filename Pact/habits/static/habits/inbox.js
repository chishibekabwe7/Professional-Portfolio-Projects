function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return '';
}

function formatTimestamp(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function buildEmptyState(message) {
  const empty = document.createElement('p');
  empty.className = 'text-muted mb-0';
  empty.textContent = message;
  return empty;
}

function createCheckInCard(checkIn, respondTemplate) {
  const card = document.createElement('article');
  card.className = 'border rounded-3 p-3 p-md-4 bg-white mb-3';
  card.dataset.checkInId = checkIn.id;

  const header = document.createElement('div');
  header.className = 'd-flex flex-column flex-md-row justify-content-between gap-3 mb-3';

  const meta = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'fw-semibold';
  title.textContent = checkIn.pact_title;
  const subtitle = document.createElement('div');
  subtitle.className = 'text-muted small';
  subtitle.textContent = `by @${checkIn.submitted_by_username} · ${formatTimestamp(checkIn.timestamp)}`;
  meta.append(title, subtitle);

  const badge = document.createElement('span');
  badge.className = 'badge text-bg-warning align-self-start';
  badge.textContent = 'Pending';

  header.append(meta, badge);

  card.appendChild(header);

  if (checkIn.note) {
    const note = document.createElement('p');
    note.className = 'mb-3';
    note.textContent = checkIn.note;
    card.appendChild(note);
  }

  if (checkIn.photo_url) {
    const photoWrap = document.createElement('div');
    photoWrap.className = 'mb-3';
    const image = document.createElement('img');
    image.src = checkIn.photo_url;
    image.alt = 'Check-in photo';
    image.className = 'img-fluid rounded-3';
    photoWrap.appendChild(image);
    card.appendChild(photoWrap);
  }

  const form = document.createElement('div');
  form.className = 'row g-3 align-items-end';
  form.innerHTML = `
    <div class="col-12 col-md-8">
      <label class="form-label" for="comment-${checkIn.id}">Comment (optional)</label>
      <textarea id="comment-${checkIn.id}" rows="3" class="form-control" placeholder="Leave a quick note for the owner"></textarea>
    </div>
    <div class="col-12 col-md-4 d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-success flex-grow-1" data-decision="approve">Approve</button>
      <button type="button" class="btn btn-outline-danger flex-grow-1" data-decision="reject">Reject</button>
    </div>
  `;

  form.querySelectorAll('button[data-decision]').forEach((button) => {
    button.addEventListener('click', async () => {
      const comment = form.querySelector('textarea').value.trim();
      await respondToCheckIn(checkIn.id, button.dataset.decision, comment, card, respondTemplate);
    });
  });

  card.appendChild(form);
  return card;
}

async function respondToCheckIn(checkInId, decision, comment, card, respondTemplate) {
  const responseUrl = respondTemplate.replace('/0/', `/${checkInId}/`);
  const payload = new URLSearchParams();
  payload.set('decision', decision);
  payload.set('comment', comment);

  const response = await fetch(responseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'X-CSRFToken': getCookie('csrftoken'),
      'Accept': 'application/json',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || 'Unable to respond to check-in.';
    alert(message);
    return;
  }

  card.remove();
  const container = document.getElementById('verification-inbox');
  if (container && !container.children.length) {
    container.appendChild(buildEmptyState('You have no pending check-ins to verify.'));
  }
}

async function loadInbox() {
  const container = document.getElementById('verification-inbox');
  if (!container) {
    return;
  }

  const { apiUrl, respondTemplate } = container.dataset;
  const response = await fetch(apiUrl, {
    headers: { 'Accept': 'application/json' },
  });
  const data = await response.json();

  container.innerHTML = '';

  if (!data.checkins || data.checkins.length === 0) {
    container.appendChild(buildEmptyState('You have no pending check-ins to verify.'));
    return;
  }

  data.checkins.forEach((checkIn) => {
    container.appendChild(createCheckInCard(checkIn, respondTemplate));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadInbox().catch(() => {
    const container = document.getElementById('verification-inbox');
    if (container) {
      container.innerHTML = '';
      container.appendChild(buildEmptyState('Unable to load verification inbox.'));
    }
  });
});
