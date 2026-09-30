const navigation = [
    ["index.html", "Home"],
    ["service.html", "Library Services"],
    ["about.html", "About the Library"],
    ["contact.html", "Help Desk"],
    ["login.html", "Login"]
];

const currentPage = window.location.pathname.split("/").pop() || "index.html";

function renderHeader() {
    const links = navigation.map(([href, label]) => {
        const active = currentPage === href ? " active" : "";
        return `<a href="${href}" class="nav-item nav-link${active}">${label}</a>`;
    }).join("");

    document.querySelector("#site-header").innerHTML = `
        <div class="container-fluid position-relative p-0">
            <nav class="navbar navbar-expand-lg navbar-dark px-5 py-3 py-lg-0">
                <a href="index.html" class="navbar-brand p-0">
                    <h1 class="m-0"><i class="fa fa-book me-2"></i>CULMS</h1>
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse" aria-label="Toggle navigation">
                    <span class="fa fa-bars"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarCollapse">
                    <div class="navbar-nav ms-auto py-0">${links}</div>
                </div>
            </nav>
        </div>`;
}

function renderFooter() {
    document.querySelector("#site-footer").innerHTML = `
        <div class="container-fluid bg-dark text-light mt-5 wow fadeInUp" data-wow-delay="0.1s">
            <div class="container">
                <div class="row gx-5">
                    <div class="col-lg-4 col-md-6 footer-about">
                        <div class="d-flex flex-column align-items-center justify-content-center text-center h-100 bg-primary p-4">
                            <a href="index.html" class="navbar-brand">
                                <h1 class="m-0 text-white"><i class="fa fa-book me-2"></i>CULMS</h1>
                            </a>
                            <p class="mt-3 mb-0">Copperbelt University Library connects students, professors and researchers with knowledge, resources and support across the university.</p>
                        </div>
                    </div>
                    <div class="col-lg-8 col-md-6">
                        <div class="row gx-5">
                            <div class="col-lg-4 col-md-12 pt-5 mb-5">
                                <div class="section-title section-title-sm position-relative pb-3 mb-4">
                                    <h3 class="text-light mb-0">Get In Touch</h3>
                                </div>
                                <div class="d-flex mb-2">
                                    <i class="bi bi-geo-alt text-primary me-2"></i>
                                    <p class="mb-0">Jambo Drive, Riverside, Kitwe, Zambia</p>
                                </div>
                                <div class="d-flex mb-2">
                                    <i class="bi bi-envelope-open text-primary me-2"></i>
                                    <p class="mb-0"><a class="text-light" href="mailto:library@cbu.ac.zm">library@cbu.ac.zm</a></p>
                                </div>
                                <div class="d-flex mb-2">
                                    <i class="bi bi-telephone text-primary me-2"></i>
                                    <p class="mb-0"><a class="text-light" href="tel:0212290811">0212-290811</a></p>
                                </div>
                            </div>
                            <div class="col-lg-4 col-md-12 pt-0 pt-lg-5 mb-5">
                                <div class="section-title section-title-sm position-relative pb-3 mb-4">
                                    <h3 class="text-light mb-0">Quick Links</h3>
                                </div>
                                <div class="link-animated d-flex flex-column justify-content-start">
                                    <a class="text-light mb-2" href="index.html"><i class="bi bi-arrow-right text-primary me-2"></i>Home</a>
                                    <a class="text-light mb-2" href="service.html"><i class="bi bi-arrow-right text-primary me-2"></i>Library Services</a>
                                    <a class="text-light mb-2" href="about.html"><i class="bi bi-arrow-right text-primary me-2"></i>About the Library</a>
                                    <a class="text-light" href="contact.html"><i class="bi bi-arrow-right text-primary me-2"></i>Help Desk</a>
                                </div>
                            </div>
                            <div class="col-lg-4 col-md-12 pt-0 pt-lg-5 mb-5">
                                <div class="section-title section-title-sm position-relative pb-3 mb-4">
                                    <h3 class="text-light mb-0">Member Access</h3>
                                </div>
                                <div class="link-animated d-flex flex-column justify-content-start">
                                    <a class="text-light mb-2" href="login.html"><i class="bi bi-arrow-right text-primary me-2"></i>Login</a>
                                    <a class="text-light mb-2" href="service.html"><i class="bi bi-arrow-right text-primary me-2"></i>Borrowing Services</a>
                                    <a class="text-light" href="contact.html"><i class="bi bi-arrow-right text-primary me-2"></i>Contact the Library</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="container-fluid text-white" style="background: #061429;">
            <div class="container text-center">
                <div class="row justify-content-end">
                    <div class="col-lg-8 col-md-6">
                        <div class="d-flex align-items-center justify-content-center" style="height: 75px;">
                            <p class="mb-0">&copy; <a class="text-white border-bottom" href="index.html">Copperbelt University Library</a>. All Rights Reserved.
                            <!--/*** The author’s attribution link must remain intact in the template. ***/-->
                            <!--/*** If you wish to remove this credit link, please purchase the Pro Version . ***/-->
                            Designed by <a class="text-white border-bottom" href="https://htmlcodex.com">HTML Codex</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export function renderSharedLayout() {
    renderHeader();
    renderFooter();
}

renderSharedLayout();
