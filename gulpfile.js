/* 
===================================== 

    GULP builder

=====================================
*/

// ===== variable =====
let p_Fold = "dist"; // путь к продакшн папке
let s_Fold = "#src"; // путь к исходникам
let fs = require("fs"); // вспомогательная переменная для автодобавления шрифтов в css
// ====================

// // ===== path =====
let path = {
    build: {
        // Пути к папкам для продакшена
        html: p_Fold + "/",
        css: p_Fold + "/css/",
        js: p_Fold + "/js/",
        img: p_Fold + "/img/",
        fonts: p_Fold + "/fonts/",
    },
    src: {
        //Пути к папкам с исходниками
        html: [s_Fold + "/*.html", "!" + s_Fold + "/_*.html"], // Ловим все файлы с .html и исключаем все файли с _.html
        css: s_Fold + "/scss/style.scss",
        js: s_Fold + "/js/script.js",
        img: s_Fold + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
        fonts: s_Fold + "/fonts/*.ttf",
    },
    watch: {
        //Следим за исходниками
        html: s_Fold + "/**/*.html",
        css: s_Fold + "/scss/**/*.scss",
        js: s_Fold + "/js/**/*.js",
        img: s_Fold + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
    },
    clean: "./" + p_Fold + "/", // Удаление папки проекта при запуске галпа
};
// ======================

// ===== add-ons gulp =====

let { src, dest } = require("gulp"), // инициализация аддонов
    gulp = require("gulp"),
    browsersync = require("browser-sync").create(),
    fileinclude = require("gulp-file-include"),
    del = require("del"),
    autoprefixer = require("gulp-autoprefixer"),
    group_media = require("gulp-group-css-media-queries"),
    clean_css = require("gulp-clean-css"),
    rename = require("gulp-rename"),
    uglify = require("gulp-uglify-es").default,
    imagemin = require("gulp-imagemin"),
    webp = require("gulp-webp"),
    webphtml = require("gulp-webp-html"),
    webpcss = require("gulp-webpcss"),
    svgSprite = require("gulp-svg-sprite"),
    ttf2woff = require("gulp-ttf2woff"),
    ttf2woff2 = require("gulp-ttf2woff2"),
    fonter = require("gulp-fonter");

const scss = require("gulp-sass")(require("sass"));

// ==========================

// ===== function =====

function browserSync() {
    // функция запуска сервера аддон browsersync
    browsersync.init({ // инициализация 
        server: {
            baseDir: "./" + p_Fold + "/",
        },
        port: 3000,
        notify: false,
    });
}


function html() { 
    // Работа с HTML 
    return src(path.src.html)
        .pipe(fileinclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream());
}

function css() { 
    // Работа со стилями
    return src(path.src.css)
        .pipe( // scss to css 
            scss({
                outputStyle: "expanded",
            }),
        )
        .pipe(group_media()) // группиовка медиазапросов
        .pipe( // Автопрефиксер для всех браузеров последние 5 версий
            autoprefixer({
                overrideBrowserslist: ["last 5 versions"], 
                cascade: true, // стиль написания
            }),
        )
        .pipe(
            webpcss({ // добавление webp формата в html
                webpClass: ".webp",
                noWebpClass: ".no-webp",
            }),
        )
        .pipe(dest(path.build.css))
        .pipe(clean_css())
        .pipe( // минификация css файла с подключением в HTML 
            rename({
                extname: ".min.css",
            }),
        )
        .pipe(dest(path.build.css))
        .pipe(browsersync.stream());
}

function js() { 
    // Работа с JS 
    return src(path.src.js)
        .pipe(fileinclude())
        .pipe(dest(path.build.js))
        .pipe(uglify()) // минификация js файла 
        .pipe(
            rename({
                extname: ".min.js",
            }),
        )
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream());
}

function images() { // Работа с изображениями
    return src(path.src.img)
        .pipe( // сжатие webp формата 
            webp({
                quality: 70,
            }),
        )
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        .pipe( // сжатие изображений 
            imagemin({
                progressive: true,
                svgoPlugins: [{ removeViewBox: false }],
                interlaced: true,
                optimizationLevel: 3,
            }),
        )
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream());
}

gulp.task("svgSprite", function () {
    // ВРУЧНУЮ! делаем sprite
    // запустить через терминал gulp svgSprite
    return gulp
        .src([s_Fold + "/iconsprite/*.svg"])
        .pipe(
            svgSprite({
                mode: {
                    stack: {
                        sprite: "../icons/icons.svg",
                        //example: true,
                    },
                },
            }),
        )
        .pipe(dest(path.build.img));
});

gulp.task("otf2ttf", function () {
    // ВРУЧНУЮ! Преобразовуем otf to ttf а дальше ttf to woff/woff2 в авто режиме
    // запустить задачу gulp otf2ttf в консоли
    return src([s_Fold + "/fonts/*.otf"])
        .pipe(
            fonter({
                formats: ["ttf"],
            }),
        )
        .pipe(dest(s_Fold + "/fonts/"));
});

function fonts() {// работаем со шрифтами
    //конвертер шрифтов в woff и woff2
    src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
    return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

function fontsStyler() { // Пишем шрифты в fonts.scss но в ручную меняем в fonts.scss 
    let file_content = fs.readFileSync(s_Fold + "/scss/fonts.scss");
    if (file_content == "") {
        fs.writeFile(s_Fold + "/scss/fonts.scss", "", techFunc);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split(".");
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(
                            s_Fold + "/scss/fonts.scss",
                            '@include font("' +
                                fontname +
                                '", "' +
                                fontname +
                                '", "400", "normal");\r\n',
                                techFunc,
                        );
                    }
                    c_fontname = fontname;
                }
            }
        });
    }
}

function techFunc() {} // сервисная функция

function watchFiles() { // Функция следилка
    gulp.watch([path.watch.html], html); // Ловим изменения в html и запускаем ф-ю html
    gulp.watch([path.watch.js], js); // Ловим изменения в js
    gulp.watch([path.watch.css], css); // ловим изменения в css и запускаем ф-ю css
    gulp.watch([path.watch.img], images); // Ловим изменения в images
}

function clean() {
    return del(path.clean);
}
// ============


// ===== сценарии =====
let build = gulp.series(
    // запуск сценария который запускает ниже перечисленные функции
    clean,
    gulp.parallel(css, html, js, images, fonts),
    gulp.parallel(fontsStyler, browserSync)
); 

let watch = gulp.parallel(build, watchFiles);
// Стартовый сценарий
// ==================


// ===== экспортируем аддоны в переменные для работы =====
exports.fontsStyler = fontsStyler;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;

// ============