/* =========================================================
   SITARE 30 — BIRTHDAY ARCHIVE
   Supabase + Personal Delete + Admin Delete
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://lfuputokddumahgvpnoy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_cB406lyCNd-4Sc93dzwNOQ_Z-ztN067";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================================================
   BOOK STATE
========================================================= */

const book =
    document.getElementById("book");

const pages = [
    ...document.querySelectorAll(".page")
];

let current = 0;


/* =========================================================
   ADMIN STATE
========================================================= */

let adminSecret = null;

let selectedAdminWishId = null;


/* =========================================================
   BOOK RENDER
========================================================= */

function render() {

    pages.forEach(
        (page, index) => {

            page.classList.toggle(
                "flipped",
                index < current
            );

        }
    );


    const progress =
        document.getElementById("progress");


    if (current === 0) {

        progress.textContent =
            "COVER • 1 / " + pages.length;

    }

    else if (
        current === pages.length - 1
    ) {

        progress.textContent =
            "THE STORY CONTINUES • "
            + (current + 1)
            + " / "
            + pages.length;

    }

    else {

        progress.textContent =
            "MEMORY PAGE • "
            + (current + 1)
            + " / "
            + pages.length;

    }

}


/* =========================================================
   NEXT / PREVIOUS
========================================================= */

function nextPage() {

    if (
        current <
        pages.length - 1
    ) {

        current++;

        render();

    }

}


function prevPage() {

    if (current > 0) {

        current--;

        render();

    }

}


/* =========================================================
   ADD WISH MODAL
========================================================= */

function openModal() {

    document
        .getElementById("modal")
        .classList.add("open");

}


function closeModal() {

    document
        .getElementById("modal")
        .classList.remove("open");

}


/* =========================================================
   ADD WISH
========================================================= */

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
            "Name must be 60 characters or less."
        );

        return;

    }


    if (message.length > 1000) {

        alert(
            "Your wish must be 1000 characters or less."
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

        /* -----------------------------------------
           PHOTO
        ----------------------------------------- */

        let photoUrl = null;

        const file =
            photoInput
                ? photoInput.files[0]
                : null;


        if (file) {

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                throw new Error(
                    "Please select an image."
                );

            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                throw new Error(
                    "Photo must be smaller than 5 MB."
                );

            }


            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            const filePath =
                `wishes/${crypto.randomUUID()}.${extension}`;


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
                    .getPublicUrl(
                        filePath
                    );


            photoUrl =
                publicUrlData.publicUrl;

        }


        /* -----------------------------------------
           PRIVATE DELETE TOKEN
        ----------------------------------------- */

        const deleteToken =
            crypto.randomUUID();


        /* -----------------------------------------
           DATABASE INSERT
        ----------------------------------------- */

        const {
            data,
            error
        } =
            await supabaseClient
                .from("wishes")
                .insert({

                    sender_name: name,

                    message: message,

                    photo_url: photoUrl,

                    delete_token: deleteToken

                })
                .select(
                    "id,sender_name,message,photo_url,approved,created_at"
                )
                .single();


        if (error) {

            throw error;

        }


        /* -----------------------------------------
           ADD PAGE
        ----------------------------------------- */

        addWishPage(data);


        current =
            pages.length - 2;


        render();


        /* -----------------------------------------
           CLOSE + RESET
        ----------------------------------------- */

        closeModal();

        nameInput.value = "";

        messageInput.value = "";

        if (photoInput) {

            photoInput.value = "";

        }


        /* -----------------------------------------
           SHOW DELETE CODE
        ----------------------------------------- */

        alert(
            "Your page has been added! ✨\n\n" +

            "IMPORTANT — SAVE THIS PRIVATE DELETE CODE:\n\n" +

            deleteToken +

            "\n\nYou will need this code if you ever want to delete your page."
        );


    }

    catch (error) {

        console.error(
            "Wish error:",
            error
        );


        alert(
            error.message ||
            "Something went wrong. Please try again."
        );

    }

    finally {

        button.disabled = false;

        button.textContent =
            "Add My Page to the Book ✨";

    }

}


/* =========================================================
   ADD DYNAMIC WISH PAGE
========================================================= */

function addWishPage(wish) {

    const page =
        document.createElement("section");


    page.className =
        "page person-page";


    page.dataset.wishId =
        wish.id;


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


    const photoHTML =
        wish.photo_url

            ? `
                <img
                    class="wish-photo"
                    src="${escapeHtml(wish.photo_url)}"
                    alt="${safeName}"
                >
              `

            : `
                <div class="person-photo">
                    💌
                </div>
              `;


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
                        For Kalpana
                    </h2>


                    <p class="quote">
                        “${safeMessage}”
                    </p>


                    <div class="from">

                        ${safeName}
                        • Classmate

                    </div>


                    <button
                        class="admin-delete"
                        onclick="openAdminDelete('${wish.id}', '${safeName}')"
                    >
                        🗑️ Admin Delete This Page
                    </button>

                </div>

            </div>


            <div class="page-number">
                NEW
            </div>

        </div>

    `;


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


    pages.forEach(
        (item, index) => {

            item.style.setProperty(
                "--z",
                pages.length - index
            );

        }
    );

}


/* =========================================================
   LOAD SAVED WISHES
========================================================= */

async function loadWishes() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("wishes")
                .select(
                    "id,sender_name,message,photo_url,approved,created_at"
                )
                .eq(
                    "approved",
                    true
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            throw error;

        }


        (data || []).forEach(
            wish => {

                addWishPage(wish);

            }
        );


        current = 0;

        render();

    }

    catch (error) {

        console.error(
            "Could not load wishes:",
            error
        );

    }

}


/* =========================================================
   PERSONAL DELETE
========================================================= */

function openDeleteModal() {

    closeModal();

    document
        .getElementById("deleteModal")
        .classList.add("open");

}


function closeDeleteModal() {

    document
        .getElementById("deleteModal")
        .classList.remove("open");


    const input =
        document.getElementById(
            "deleteCode"
        );


    if (input) {

        input.value = "";

    }

}


/* =========================================================
   DELETE MY OWN WISH
========================================================= */

async function deleteWish() {

    const tokenInput =
        document.getElementById(
            "deleteCode"
        );


    const token =
        tokenInput.value.trim();


    if (!token) {

        alert(
            "Please enter your delete code."
        );

        return;

    }


    if (
        !confirm(
            "Are you sure you want to permanently delete your wish?"
        )
    ) {

        return;

    }


    const button =
        document.querySelector(
            "#deleteModal .primary"
        );


    button.disabled = true;

    button.textContent =
        "Deleting...";


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "delete_my_wish",
                {
                    secret_token: token
                }
            );


        if (error) {

            throw error;

        }


        if (!data) {

            alert(
                "Invalid delete code. No wish was deleted."
            );

            return;

        }


        alert(
            "Your wish has been deleted. 🗑️"
        );


        closeDeleteModal();


        location.reload();

    }

    catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Could not delete the wish. Please try again."
        );

    }

    finally {

        button.disabled = false;

        button.textContent =
            "Delete My Page";

    }

}


/* =========================================================
   ADMIN LOGIN
========================================================= */

function openAdminLogin() {

    document
        .getElementById("adminModal")
        .classList.add("open");


    setTimeout(
        () => {

            document
                .getElementById("adminCode")
                .focus();

        },
        100
    );

}


function closeAdminLogin() {

    document
        .getElementById("adminModal")
        .classList.remove("open");


    document
        .getElementById("adminCode")
        .value = "";

}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function loginAdmin() {

    const input =
        document.getElementById(
            "adminCode"
        );


    const enteredCode =
        input.value.trim();


    if (!enteredCode) {

        alert(
            "Please enter the admin code."
        );

        return;

    }


    const button =
        document.querySelector(
            "#adminModal .primary"
        );


    button.disabled = true;

    button.textContent =
        "Checking access...";


    try {

        /*
         * We verify the code through the database.
         * The actual admin secret is NEVER stored
         * inside this JavaScript file.
         */

        const {
            data,
            error
        } =
            await supabaseClient
                .from("admin_settings")
                .select("id")
                .eq("id", 1)
                .eq(
                    "admin_secret",
                    enteredCode
                )
                .maybeSingle();


        /*
         * Because RLS is enabled and there is
         * intentionally NO public SELECT policy,
         * the above direct check will normally fail.
         *
         * Therefore we use the dedicated verification RPC
         * below.
         */

        if (error) {

            console.log(
                "Direct admin check blocked as expected."
            );

        }


        /*
         * Store entered code locally ONLY after
         * the admin delete RPC confirms it.
         */

        const testResult =
            await supabaseClient.rpc(
                "admin_delete_wish",
                {
                    secret_token: enteredCode,
                    wish_id:
                        "00000000-0000-0000-0000-000000000000"
                }
            );


        /*
         * A false result means:
         * - invalid admin code, OR
         * - simply no matching dummy wish.
         *
         * We need a separate verification function
         * for clean authentication.
         */

        if (
            testResult.error &&
            !String(
                testResult.error.message
            ).includes("permission")
        ) {

            /*
             * If RPC itself works, false means the
             * admin code was probably checked and no
             * dummy wish existed.
             *
             * We therefore perform a safe verification
             * using the admin verification RPC.
             */

        }


        const {
            data: verified,
            error: verifyError
        } =
            await supabaseClient.rpc(
                "verify_admin_code",
                {
                    secret_token: enteredCode
                }
            );


        if (verifyError) {

            throw verifyError;

        }


        if (!verified) {

            alert(
                "Invalid admin code."
            );

            return;

        }


        adminSecret =
            enteredCode;


        document.body.classList.add(
            "admin-mode"
        );


        closeAdminLogin();


        alert(
            "Admin controls unlocked. 🔐"
        );


    }

    catch (error) {

        console.error(
            "Admin login error:",
            error
        );


        alert(
            "Could not verify admin access."
        );

    }

    finally {

        button.disabled = false;

        button.textContent =
            "Unlock Admin Controls";

    }

}


/* =========================================================
   ADMIN DELETE OPEN
========================================================= */

function openAdminDelete(
    wishId,
    senderName
) {

    if (!adminSecret) {

        alert(
            "Please unlock Admin Controls first."
        );

        openAdminLogin();

        return;

    }


    selectedAdminWishId =
        wishId;


    document.getElementById(
        "adminDeleteText"
    ).textContent =
        `You are about to permanently delete ${senderName}'s page from the birthday archive.`;


    document
        .getElementById(
            "adminDeleteModal"
        )
        .classList.add("open");

}


/* =========================================================
   CLOSE ADMIN DELETE
========================================================= */

function closeAdminDeleteModal() {

    document
        .getElementById(
            "adminDeleteModal"
        )
        .classList.remove("open");


    selectedAdminWishId = null;

}


/* =========================================================
   CONFIRM ADMIN DELETE
========================================================= */

async function confirmAdminDelete() {

    if (!adminSecret) {

        alert(
            "Admin access expired."
        );

        closeAdminDeleteModal();

        return;

    }


    if (!selectedAdminWishId) {

        alert(
            "No page selected."
        );

        return;

    }


    if (
        !confirm(
            "This will permanently delete this wish. Continue?"
        )
    ) {

        return;

    }


    const button =
        document.querySelector(
            "#adminDeleteModal .danger-button"
        );


    button.disabled = true;

    button.textContent =
        "Deleting...";


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "admin_delete_wish",
                {
                    secret_token:
                        adminSecret,

                    wish_id:
                        selectedAdminWishId
                }
            );


        if (error) {

            throw error;

        }


        if (!data) {

            alert(
                "Admin code is invalid or the wish no longer exists."
            );

            return;

        }


        alert(
            "The wish has been permanently deleted. 🗑️"
        );


        closeAdminDeleteModal();


        location.reload();

    }

    catch (error) {

        console.error(
            "Admin delete error:",
            error
        );


        alert(
            "Could not delete this wish."
        );

    }

    finally {

        button.disabled = false;

        button.textContent =
            "Permanently Delete";

    }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value).replace(
        /[&<>'"]/g,
        function (character) {

            return {

                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                "'":
                    "&#39;",

                '"':
                    "&quot;"

            }[character];

        }
    );

}


/* =========================================================
   MODAL BACKGROUND CLICK
========================================================= */

document
    .getElementById("modal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id === "modal"
            ) {

                closeModal();

            }

        }
    );


document
    .getElementById("deleteModal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "deleteModal"
            ) {

                closeDeleteModal();

            }

        }
    );


document
    .getElementById("adminModal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "adminModal"
            ) {

                closeAdminLogin();

            }

        }
    );


document
    .getElementById("adminDeleteModal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "adminDeleteModal"
            ) {

                closeAdminDeleteModal();

            }

        }
    );


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "ArrowRight"
        ) {

            nextPage();

        }


        if (
            event.key === "ArrowLeft"
        ) {

            prevPage();

        }


        if (
            event.key === "Escape"
        ) {

            closeModal();

            closeDeleteModal();

            closeAdminLogin();

            closeAdminDeleteModal();

        }

    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

loadWishes();

render();