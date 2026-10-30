// Slider
let activeSlide = document.getElementsByClassName('slide active');
let lenSlide = document.getElementsByClassName('slide').length;



function showSlide(id) {
	let slideId = activeSlide[0].id;
	let activePaginator = document.getElementById('slide'+slideId);
	let backSlideId = Number(slideId)-1 <= 0 ? lenSlide : Number(slideId)-1;
	let nextSlideId = Number(slideId)+1 > lenSlide ? 1 : Number(slideId)+1;
	let nextSlide = document.getElementById(nextSlideId);
	let backSlide = document.getElementById(backSlideId);
	
	// remove oldest active slides
	backSlide.classList.remove('back-slide');
	nextSlide.classList.remove('next-slide');
	activeSlide[0].classList.remove('n-animation','active');
	activePaginator.classList.remove('active');

	// Checking which diraction turn the slider
	if ( (id == true) && (!Number.isInteger(id)) ) {
		nextSlide.classList.add('active');
		document.getElementById('slide'+String(nextSlide.id)).classList.add('active');
		document.getElementById(slideId).classList.add('back-slide');

		if (nextSlideId == lenSlide) {
			document.getElementById(1).classList.add('next-slide');
		}else{
			document.getElementById(nextSlideId+1).classList.add('next-slide');
		}

	}else if (id == false) {
		backSlide.classList.add('active');
		document.getElementById('slide'+String(backSlide.id)).classList.add('active');
		document.getElementById(slideId).classList.add('next-slide');

		if (backSlideId == 1) {
			document.getElementById(lenSlide).classList.add('back-slide');
		}else{
			document.getElementById(backSlideId-1).classList.add('back-slide');
		}
	// Condition when using slider navigation
	}else{
		let backSlideId = Number(id)-1 <= 0 ? lenSlide : Number(id)-1;
		let nextSlideId = Number(id)+1 > lenSlide ? 1 : Number(id)+1;
		document.getElementById(id).classList.add('active');
		document.getElementById(nextSlideId).classList.add('next-slide');
		document.getElementById(backSlideId).classList.add('back-slide');
		document.getElementById('slide'+id).classList.add('active');
	}
	
}


// Show work window (portfolio)
function previewWork(id) {
	let el = document.getElementById(id);

	if (el.classList.contains('active') == true) {
		el.classList.remove('active');
	}else if (el.classList.contains('active') != true) {
		el.classList.add('active');
	}
}


function filterWork(id=null) {
	let filterName = document.getElementById('works-filter').children[id].name;
	let workItems = document.getElementsByName(filterName);

	// Remove the old classes
	document.getElementById('works-filter')
		.getElementsByClassName('active')[0].classList.remove('active');
	document.getElementById('works')
		.getElementsByClassName('active')[0].classList.remove('active');

	document.getElementById(id).classList.add('active');

	for (var i = workItems.length - 1; i >= 0; i--) {
		workItems[i].classList.add('active');
	}


}






