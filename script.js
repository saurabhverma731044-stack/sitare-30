
const SUPABASE_URL =
    'https://lfuputokddumahgvpnoy.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_cB406lyCNd-4Sc93dzwNOQ_Z-ztN067';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// ==========================================
// GLOBAL STATE
// ==========================================

let currentEvent = null;
let book = null;
let pages = [];
let current = 0;


// ==========================================
// BIRTHDAY EVENT
// ==========================================

async function loadBirthdayEvent() {

    try {

        const params = new URLSearchParams(
            window.location.search
        );

        const eventSlug = params.get('event');

        let query = supabaseClient
            .from('birthday_events')
            .select(`
                id,
                birthday_person_name,
                birthday_date,
                year,
                cover_message,
                slug
            `)
            .eq('is_active', true);

        // If URL contains ?event=slug
        // load that specific birthday.
        if (eventSlug) {

            query = query.eq(
                'slug',
                eventSlug
            );

        }

        const {
            data,
            error
        } = await query
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {

            console.error(
                'No active birthday event found.'
            );

            showEventError();

            return false;
        }

        currentEvent = data;

        updateBirthdayUI();

        return true;

    } catch (error) {

        console.error(
            'Could not load birthday event:',
            error
        );

        showEventError();

        return false;
    }
}


// ==========================================
// EVENT ERROR
// ==========================================

function showEventError() {

    const nameElement =
        document.getElementById(
            'birthdayName'
        );

    const messageElement =
        document.getElementById(
            'coverMessage'
        );

    if (nameElement) {

        nameElement.textContent =
            'Birthday Archive';

    }

    if (messageElement) {

        messageElement.textContent =
            'This birthday archive is not available yet.';

    }

}


// ==========================================
// UPDATE BIRTHDAY UI
// ==========================================

function updateBirthdayUI() {

    if (!currentEvent) return;

    const birthdayName =
        currentEvent.birthday_person_name ||
        'Birthday Star';

    const coverMessage =
        currentEvent.cover_message ||
        'Today is your page in our story.';


    // Cover heading

    const birthdayNameElement =
        document.getElementById(
            'birthdayName'
        );

    if (birthdayNameElement) {

        birthdayNameElement.textContent =
            birthdayName;

    }


    // Cover message

    const coverMessageElement =
        document.getElementById(
            'coverMessage'
        );

    if (coverMessageElement) {

        coverMessageElement.textContent =
            coverMessage;

    }


    // Any other birthday-name elements

    document
        .querySelectorAll('.birthday-name')
        .forEach(element => {

            element.textContent =
                birthdayName;

        });


    document
        .querySelectorAll('[data-birthday-name]')
        .forEach(element => {

            element.textContent =
                birthdayName;

        });

}


// ==========================================
// BOOK INITIALIZATION
// ==========================================

function initializeBookElements() {

    book =
        document.getElementById(
            'book'
        );

    pages =
        [
            ...document.querySelectorAll(
                '.page'
            )
        ];

}


// ==========================================
// BOOK RENDER
// ==========================================

function render() {

    if (!pages.length) return;

    pages.forEach(
        (page, index) => {

            page.classList.toggle(
                'flipped',
                index < current
            );

        }
    );


    const progress =
        document.getElementById(
            'progress'
        );

    if (!progress) return;


    let label = 'MEMORY PAGE';

    if (current === 0) {

        label = 'COVER';

    } else if (
        current === pages.length - 1
    ) {

        label =
            'THE STORY CONTINUES';

    }


    progress.textContent =
        label +
        ' • ' +
        (current + 1) +
        ' / ' +
        pages.length;

}


// ==========================================
// NEXT PAGE
// ==========================================

function nextPage() {

    if (
        current <
        pages.length - 1
    ) {

        current++;

        render();

    }

}


// ==========================================
// PREVIOUS PAGE
// ==========================================

function prevPage() {

    if (current > 0) {

        current--;

        render();

    }

}


// ==========================================
// WISH MODAL
// ==========================================

function openModal() {

    const modal =
        document.getElementById(
            'modal'
        );

    if (modal) {

        modal.classList.add(
            'open'
        );

    }

}


function closeModal() {

    const modal =
        document.getElementById(
            'modal'
        );

    if (modal) {

        modal.classList.remove(
            'open'
        );

    }

}


// ==========================================
// ADD WISH
// ==========================================

async function addWish() {

    if (!currentEvent) {

        alert(
            'This birthday archive is not ready yet.'
        );

        return;

    }


    const nameInput =
        document.getElementById(
            'name'
        );

    const messageInput =
        document.getElementById(
            'message'
        );

    const photoInput =
        document.getElementById(
            'photo'
        );


    const name =
        nameInput
            ? nameInput.value.trim()
            : '';

    const message =
        messageInput
            ? messageInput.value.trim()
            : '';


    if (!name || !message) {

        alert(
            'Please enter your name and wish.'
        );

        return;

    }


    const button =
        document.querySelector(
            '#modal .primary'
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            'Saving your page... ✨';

    }


    try {

        let photoUrl = null;


        // ==================================
        // PHOTO UPLOAD
        // ==================================

        const file =
            photoInput
                ? photoInput.files[0]
                : null;


        if (file) {

            if (
                !file.type.startsWith(
                    'image/'
                )
            ) {

                throw new Error(
                    'Please select an image.'
                );

            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                throw new Error(
                    'Photo must be smaller than 5 MB.'
                );

            }


            const extension =
                file.name
                    .split('.')
                    .pop()
                    .toLowerCase();


            const filePath =
                `wishes/${crypto.randomUUID()}.${extension}`;


            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from(
                        'birthday-photos'
                    )
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
                    .from(
                        'birthday-photos'
                    )
                    .getPublicUrl(
                        filePath
                    );


            photoUrl =
                publicUrlData.publicUrl;

        }


        // ==================================
        // DELETE TOKEN
        // ==================================

        const deleteToken =
            crypto.randomUUID();


        // ==================================
        // SAVE WISH
        // ==================================

        const {
            data,
            error
        } =
            await supabaseClient
                .from('wishes')
                .insert({

                    event_id:
                        currentEvent.id,

                    sender_name:
                        name,

                    message:
                        message,

                    photo_url:
                        photoUrl,

                    delete_token:
                        deleteToken

                })
                .select(`
                    id,
                    event_id,
                    sender_name,
                    message,
                    photo_url,
                    approved,
                    created_at
                `)
                .single();


        if (error) {

            throw error;

        }


        // ==================================
        // ADD PAGE IMMEDIATELY
        // ==================================

        addWishPage(data);


        // The newly added page is immediately
        // before the final "Story Continues" page.

        current =
            pages.length - 2;


        render();


        // ==================================
        // RESET FORM
        // ==================================

        closeModal();


        if (nameInput) {

            nameInput.value = '';

        }

        if (messageInput) {

            messageInput.value = '';

        }

        if (photoInput) {

            photoInput.value = '';

        }


        // ==================================
        // DELETE CODE
        // ==================================

        alert(
            'Your page has been added! ✨\n\n' +
            'IMPORTANT — SAVE THIS PRIVATE DELETE CODE:\n\n' +
            deleteToken +
            '\n\n' +
            'You will need this code if you ever want to delete your page.'
        );


    } catch (error) {

        console.error(
            'Wish error:',
            error
        );


        alert(
            error.message ||
            'Something went wrong. Please try again.'
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                'Add My Page to the Book ✨';

        }

    }

}


// ==========================================
// CREATE WISH PAGE
// ==========================================

function addWishPage(wish) {

    if (!book || !currentEvent) {
        return;
    }


    const page =
        document.createElement(
            'section'
        );


    page.className =
        'page person-page';


    page.style.setProperty(
        '--z',
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


    const birthdayName =
        escapeHtml(
            currentEvent.birthday_person_name
        );


    // ==================================
    // PHOTO
    // ==================================

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


    // ==================================
    // PAGE CONTENT
    // ==================================

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
                        For ${birthdayName}
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
                NEW
            </div>

        </div>

    `;


    // ==================================
    // INSERT BEFORE FINAL PAGE
    // ==================================

    const finalPage =
        pages[
            pages.length - 1
        ];


    if (!finalPage) {

        return;

    }


    book.insertBefore(
        page,
        finalPage
    );


    pages.splice(
        pages.length - 1,
        0,
        page
    );


    // ==================================
    // UPDATE Z-INDEX
    // ==================================

    pages.forEach(
        (item, index) => {

            item.style.setProperty(
                '--z',
                pages.length - index
            );

        }
    );

}


// ==========================================
// LOAD WISHES
// ==========================================

async function loadWishes() {

    if (!currentEvent) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from('wishes')
                .select(`
                    id,
                    event_id,
                    sender_name,
                    message,
                    photo_url,
                    approved,
                    created_at
                `)
                .eq(
                    'event_id',
                    currentEvent.id
                )
                .eq(
                    'approved',
                    true
                )
                .order(
                    'created_at',
                    {
                        ascending: true
                    }
                );


        if (error) {

            throw error;

        }


        // Add database wishes to book

        (data || []).forEach(
            wish => {

                addWishPage(
                    wish
                );

            }
        );


        current = 0;

        render();


    } catch (error) {

        console.error(
            'Could not load wishes:',
            error
        );

    }

}


// ==========================================
// DELETE WISH MODAL
// ==========================================

function openDeleteModal() {

    const modal =
        document.getElementById(
            'deleteModal'
        );

    if (modal) {

        modal.classList.add(
            'open'
        );

    }

}


function closeDeleteModal() {

    const modal =
        document.getElementById(
            'deleteModal'
        );

    if (modal) {

        modal.classList.remove(
            'open'
        );

    }


    const input =
        document.getElementById(
            'deleteCode'
        );


    if (input) {

        input.value = '';

    }

}


// ==========================================
// DELETE WISH
// ==========================================

async function deleteWish() {

    const tokenInput =
        document.getElementById(
            'deleteCode'
        );


    const token =
        tokenInput
            ? tokenInput.value.trim()
            : '';


    if (!token) {

        alert(
            'Please enter your delete code.'
        );

        return;

    }


    if (
        !confirm(
            'Are you sure you want to permanently delete your wish?'
        )
    ) {

        return;

    }


    const button =
        document.querySelector(
            '#deleteModal .primary'
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            'Deleting...';

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    'delete_my_wish',
                    {
                        secret_token:
                            token
                    }
                );


        if (error) {

            throw error;

        }


        if (!data) {

            alert(
                'Invalid delete code. No wish was deleted.'
            );

            return;

        }


        alert(
            'Your wish has been deleted. 🗑️'
        );


        closeDeleteModal();

        location.reload();


    } catch (error) {

        console.error(
            'Delete error:',
            error
        );


        alert(
            'Could not delete the wish. Please try again.'
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                'Delete My Page';

        }

    }

}


// ==========================================
// SECURITY HELPER
// ==========================================

function escapeHtml(value) {

    return String(
        value ?? ''
    ).replace(
        /[&<>'"]/g,
        character => ({

            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'

        })[character]
    );

}


// ==========================================
// MODAL EVENTS
// ==========================================

function setupModalEvents() {

    const modal =
        document.getElementById(
            'modal'
        );

    if (modal) {

        modal.addEventListener(
            'click',
            event => {

                if (
                    event.target.id ===
                    'modal'
                ) {

                    closeModal();

                }

            }
        );

    }


    const deleteModal =
        document.getElementById(
            'deleteModal'
        );

    if (deleteModal) {

        deleteModal.addEventListener(
            'click',
            event => {

                if (
                    event.target.id ===
                    'deleteModal'
                ) {

                    closeDeleteModal();

                }

            }
        );

    }

}


// ==========================================
// KEYBOARD CONTROLS
// ==========================================

function setupKeyboardControls() {

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key ===
                'ArrowRight'
            ) {

                nextPage();

            }


            if (
                event.key ===
                'ArrowLeft'
            ) {

                prevPage();

            }


            if (
                event.key ===
                'Escape'
            ) {

                closeModal();

                closeDeleteModal();

            }

        }
    );

}


// ==========================================
// START BOOK
// ==========================================

async function initializeBook() {

    initializeBookElements();

    setupModalEvents();

    setupKeyboardControls();


    const eventLoaded =
        await loadBirthdayEvent();


    if (!eventLoaded) {

        console.error(
            'Birthday archive could not be initialized.'
        );

        render();

        return;

    }


    await loadWishes();

    render();

}


// ==========================================
// START
// ==========================================

initializeBook();

