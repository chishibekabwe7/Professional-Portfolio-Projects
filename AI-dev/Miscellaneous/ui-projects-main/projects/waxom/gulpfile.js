const {src, dest, watch} = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const minifyCss = require('gulp-clean-css');


const bundleSass = () => {
	return src('./assets/scss/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(dest('./assets/css/'))
};

const devWatch = () => {
	watch('./assets/scss/*.scss', bundleSass);
};

const assemblySass = () => {
	return src('./assets/scss/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(minifyCss())
		.pipe(dest('./assets/css/'))

}


exports.bundleSass = bundleSass;
exports.devWatch = devWatch;
exports.assemblySass = assemblySass;
exports.default = assemblySass;
