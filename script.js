/* =========================
   SUPABASE
========================= */

const SUPABASE_URL =
    "https://lfuputokddumahgvpnoy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_cB406lyCNd-4Sc93dzwNOQ_Z-ztN067";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================
   BOOK SETUP
========================= */

const book =
    document.getElementById("book");

const pages = [
    ...document.querySelectorAll(".page")
];

let current = 0;


/* =========================
   RENDER BOOK
========================= */

function render() {

    pages.forEach((page, index) => {

        page.classList.toggle(
            "flipped",
            index < current
        );

    });


    const progress =
        document.getElementById("progress");


    let title;


    if (current === 0) {

        title = "COVER";

    } else if (current === pages.length - 1) {

        title = "THE STORY CONTINUES";

    } else {

        title = "MEMORY PAGE";

    }


    progress.textContent =
        `${title} • ${current + 1} / ${pages.length}`;
}


/* =========================
   NEXT PAGE
========================= */

function nextPage() {

    if (current < pages.length - 1) {

        current++;

        render();
    }
}


/* =========================
   PREVIOUS PAGE
========================= */

function prevPage() {

    if (current > 0) {

        current--;

        render();
    }
}


/* =========================
   OPEN MODAL
========================= */

function openModal() {

    document
        .getElementById("modal")
        .classList.add("open");
}


/* =========================
   CLOSE MODAL
========================= */

function closeModal() {

    document
        .getElementById("modal")
        .classList.remove("open");
}


/* =========================
   ADD WISH
========================= */

async function addWish() {

    const nameInput =
        document.getElementById("name");

    const messageInput =
        document.getElementById("message");

    const photoInput =
        document.getElementById("photo");


    const name =
        nameInput.value.trim();

    const message =
        messageInput.value.trim();


    if (!name || !message) {

        alert(
            "Please enter your name and wish."
        );

        return;
    }


    if (name.length > 60) {

        alert(
            "Please keep your name under 60 characters."
        );

        return;
    }


    if (message.length > 1000) {

        alert(
            "Please keep your message under 1000 characters."
        );

        return;
    }


    const button =
        document.querySelector(
            "#modal .primary"
        );


    button.disabled = true;

    button.textContent =
        "Saving your page... ✨";


    try {

        let photoUrl = null;


        /* =========================
           PHOTO UPLOAD
        ========================= */

        const file =
            photoInput.files[0];


        if (file) {

            if (!file.type.startsWith("image/")) {

                throw new Error(
                    "Please select an image file."
                );
            }


            if (file.size > 5 * 1024 * 1024) {

                throw new Error(
                    "Photo must be smaller than 5 MB."
                );
            }


            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            const fileName =
                `${crypto.randomUUID()}.${extension}`;


            const filePath =
                `wishes/${fileName}`;


            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from("birthday-photos")
                    .upload(
                        filePath,
                        file
                    );


            if (uploadError) {

                throw uploadError;
            }


            const {
                data: publicUrlData
            } =
                supabaseClient
                    .storage
                    .from("birthday-photos")
                    .getPublicUrl(filePath);


            photoUrl =
                publicUrlData.publicUrl;
        }


        /* =========================
           SAVE WISH
        ========================= */

        const {
            data,
            error
        } =
            await supabaseClient
                .from("wishes")
                .insert({
                    sender_name: name,
                    message: message,
                    photo_url: photoUrl
                })
                .select()
                .single();


        if (error) {

            throw error;
        }


        /* =========================
           ADD PAGE
        ========================= */

        addWishPage(data);


        /*
            Put the newly created page
            in front of the final page.
        */

        current =
            pages.length - 2;


        render();


        /* =========================
           CLOSE + CLEAR
        ========================= */

        closeModal();

        nameInput.value = "";

        messageInput.value = "";

        photoInput.value = "";


        alert(
            "Your beautiful page has been added to the archive! ✨"
        );


    } catch (error) {

        console.error(
            "Wish submission error:",
            error
        );


        alert(
            "Something went wrong while saving your wish. Please try again."
        );


    } finally {

        button.disabled = false;

        button.textContent =
            "Add My Page to the Book ✨";
    }
}


/* =========================
   CREATE MEMORY PAGE
========================= */

function addWishPage(wish) {

    const page =
        document.createElement("section");


    page.className =
        "page person-page";


    page.style.setProperty(
        "--z",
        pages.length + 1
    );


    const safeName =
        escapeHtml(
            wish.sender_name
        );


    const safeMessage =
        escapeHtml(
            wish.message
        );


    let photoHTML;


    if (wish.photo_url) {

        photoHTML = `
            <img
                class="wish-photo"
                src="${wish.photo_url}"
                alt="${safeName}"
            >
        `;

    } else {

        photoHTML = `
            <div class="person-photo">
                💌
            </div>
        `;
    }


    page.innerHTML = `

        <div class="page-inner">

            <div class="person-layout">

                ${photoHTML}


                <div>

                    <div class="chapter">
                        A NEW PAGE FROM
                        ${safeName.toUpperCase()}
                    </div>


                    <h2>
                        For Ananya
                    </h2>


                    <p class="quote">
                        “${safeMessage}”
                    </p>


                    <div class="from">
                        ${safeName} • Classmate
                    </div>

                </div>

            </div>


            <div class="page-number">
                ${pages.length + 1}
            </div>

        </div>
    `;


    /*
        Final page is currently
        the last page of the book.

        Insert new wish BEFORE it.
    */

    const finalPage =
        pages[pages.length - 1];


    book.insertBefore(
        page,
        finalPage
    );


    pages.splice(
        pages.length - 1,
        0,
        page
    );


    /*
        Recalculate z-index
    */

    pages.forEach(
        (item, index) => {

            item.style.setProperty(
                "--z",
                pages.length - index
            );

        }
    );
}


/* =========================
   LOAD WISHES FROM SUPABASE
========================= */

async function loadWishes() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("wishes")
                .select("*")
                .eq("approved", true)
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            throw error;
        }


        data.forEach(
            wish => {

                addWishPage(wish);

            }
        );


        /*
            Start from cover.
        */

        current = 0;

        render();


    } catch (error) {

        console.error(
            "Could not load wishes:",
            error
        );
    }
}


/* =========================
   HTML SECURITY
========================= */

function escapeHtml(value) {

    return String(value).replace(
        /[&<>'"]/g,
        function (character) {

            return {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                "'": "&#39;",

                '"': "&quot;"

            }[character];

        }
    );
}


/* =========================
   MODAL OUTSIDE CLICK
========================= */

document
    .getElementById("modal")
    .addEventListener(
        "click",
        function (event) {

            if (
                event.target.id === "modal"
            ) {

                closeModal();
            }

        }
    );


/* =========================
   KEYBOARD NAVIGATION
========================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "ArrowRight") {

            nextPage();
        }


        if (event.key === "ArrowLeft") {

            prevPage();
        }


        if (event.key === "Escape") {

            closeModal();
        }

    }
);


/* =========================
   INITIAL LOAD
========================= */

loadWishes();