const navigation = [
    ["index.html", "Home"],
    ["service.html", "Services"],
    ["about.html", "About"],
    ["contact.html", "Help Desk"]
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
                <a href="index.html" class="navbar-brand p-0"><h1 class="m-0"><i class="fa fa-book me-2"></i>CULMS</h1></a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse" aria-label="Toggle navigation"><span class="fa fa-bars"></span></button>
                <div class="collapse navbar-collapse" id="navbarCollapse">
                    <div class="navbar-nav ms-auto py-0">${links}</div>
                    <a href="login.html" class="btn btn-primary py-2 px-4 ms-3">Login</a>
                </div>
            </nav>
        </div>`;
}

function renderFooter() {
    document.querySelector("#site-footer").innerHTML = `
        <footer class="container-fluid bg-dark text-light mt-5">
            <div class="container py-5">
                <div class="row g-4">
                    <div class="col-lg-5">
                        <h2 class="text-white"><i class="fa fa-book me-2"></i>CULMS</h2>
                        <p class="mb-0">Copperbelt University Library, Kitwe, Zambia. Connecting our university community with knowledge and support.</p>
                    </div>
                    <div class="col-lg-3">
                        <h4 class="text-white mb-3">Quick links</h4>
                        <a class="text-light d-block mb-2" href="index.html">Home</a>
                        <a class="text-light d-block mb-2" href="service.html">Library Services</a>
                        <a class="text-light d-block mb-2" href="about.html">About the Library</a>
                        <a class="text-light d-block" href="contact.html">Help Desk</a>
                    </div>
                    <div class="col-lg-4">
                        <h4 class="text-white mb-3">Visit the library</h4>
                        <p class="mb-2"><i class="bi bi-geo-alt text-primary me-2"></i>Copperbelt University Library, Kitwe, Zambia</p>
                        <p class="mb-2"><i class="bi bi-telephone text-primary me-2"></i><!-- TODO: add confirmed library phone number -->Phone number to be confirmed</p>
                        <p class="mb-0"><i class="bi bi-envelope-open text-primary me-2"></i><!-- TODO: add confirmed library email address -->Email address to be confirmed</p>
                    </div>
                </div>
            </div>
            <div class="container-fluid text-white culms-footer-bar">
                <div class="container text-center"><div class="d-flex align-items-center justify-content-center" style="min-height: 75px;">
                    <p class="mb-0">&copy; <a class="text-white border-bottom" href="index.html">Copperbelt University Library</a>. All Rights Reserved.
                    <!--/*** The author’s attribution link must remain intact in the template. ***/-->
                    <!--/*** If you wish to remove this credit link, please purchase the Pro Version . ***/-->
                    Designed by <a class="text-white border-bottom" href="https://htmlcodex.com">HTML Codex</a></p>
                </div></div>
            </div>
        </footer>`;
}

renderHeader();
renderFooter();
