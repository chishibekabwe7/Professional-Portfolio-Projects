var 
  	gulp 			 		 = require('gulp'),
  	minifyCss 		 = require('gulp-clean-css'),
  	rename     		 = require('gulp-rename');


// gulp.task('main_css', function () {
// 	return gulp.src('./css/main.css')
// 		.pipe(gulp.dest('./css/'))
// 		.pipe(minifyCss())
// 		.pipe(rename({
// 				suffix: ".min"
// 			}))
// 		.pipe(gulp.dest('./css/'))
// 	});


// gulp.task('media_css', function () {
// 	return gulp.src('./css/main.css')
// 		.pipe(gulp.dest('./css/'))
// 		.pipe(minifyCss())
// 		.pipe(rename({
// 				suffix: ".min"
// 			}))
// 		.pipe(gulp.dest('./css/'))
// 	});

function main_css() {
	return gulp.src('./css/main.css')
		.pipe(gulp.dest('./css/'))
		.pipe(minifyCss())
		.pipe(rename({
				suffix: ".min"
			}))
		.pipe(gulp.dest('./css/'))
}


function media_css() {
	return gulp.src('./css/media.css')
		.pipe(gulp.dest('./css/'))
		.pipe(minifyCss())
		.pipe(rename({
				suffix: ".min"
			}))
		.pipe(gulp.dest('./css/'));
}

gulp.task('default', function () {
	return media_css(), main_css();
});
