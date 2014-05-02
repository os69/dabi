var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('default', function () {
    return gulp.src(['./dobi/eventing.js', './dobi/list.js', './dobi/property.js', './dobi/binding.js'])
        .pipe(uglify())
        .pipe(concat('dobi.min.js'))
        .pipe(gulp.dest('./rel'));
});