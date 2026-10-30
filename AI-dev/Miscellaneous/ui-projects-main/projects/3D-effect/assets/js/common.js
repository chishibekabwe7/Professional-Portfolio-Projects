document.addEventListener('DOMContentLoaded', function() {
	const screenWidth = document.documentElement.clientWidth;

	const showSlider = new Swiper('.showcase-carousel', {
		loop: true,
		slidesPerView: screenWidth < 425 ? 1.5 : 3,
		speed: 1800,
    centeredSlides: true,
		navigation: {
			nextEl: '.showcase-navigation__next',
			prevEl: '.showcase-navigation__prev'
		}
	})

	document.querySelector('video').playbackRate = 2

})