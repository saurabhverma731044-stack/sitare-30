const SUPABASE_URL =
    "https://lfuputokddumahgvpnoy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_cB406lyCNd-4Sc93dzwNOQ_Z-ztN067";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


let currentUser = null;
let birthdayEvent = null;
let wishes = [];


async function initializeDashboard() {

    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();


    if (!user) {

        window.location.href =
            "birthday-login.html";

        return;
    }


    currentUser = user;


    const {
        data: event,
        error: eventError
    } = await supabaseClient
        .from("birthday_events")
        .select("*")
        .eq("birthday_person_id", user.id)
        .eq("is_active", true)
        .maybeSingle();


    if (eventError) {

        console.error(eventError);

        alert(
            "Could not load your birthday event."
        );

        return;
    }


    if (!event) {

        await supabaseClient.auth.signOut();

        alert(
            "This account is not registered as a birthday student."
        );

        window.location.href =
            "birthday-login.html";

        return;
    }


    birthdayEvent = event;


    document.getElementById(
        "birthdayName"
    ).textContent = event.birthday_person_name;


    await loadWishes();
}


async function loadWishes() {

    const {
        data,
        error
    } = await supabaseClient
        .from("wishes")
        .select(`
            id,
            sender_name,
            message,
            photo_url,
            created_at,
            event_id
        `)
        .eq("event_id", birthdayEvent.id)
        .eq("approved", true)
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error(error);

        document.getElementById(
            "wishesContainer"
        ).innerHTML = `
            <div class="empty">
                Could not load wishes.
            </div>
        `;

        return;
    }


    wishes = data || [];


    document.getElementById(
        "wishCount"
    ).textContent = wishes.length;


    document.getElementById(
        "photoCount"
    ).textContent =
        wishes.filter(
            wish => wish.photo_url
        ).length;


    renderWishes();
}


function renderWishes() {

    const container =
        document.getElementById(
            "wishesContainer"
        );


    if (!wishes.length) {

        container.innerHTML = `
            <div class="empty">
                No wishes have arrived yet.
            </div>
        `;

        return;
    }


    container.innerHTML = wishes.map(wish => {

        const safeName =
            escapeHtml(wish.sender_name);

        const safeMessage =
            escapeHtml(wish.message);


        return `
            <article
                class="wish"
                data-wish-id="${wish.id}"
            >

                <div class="wish-name">
                    ${safeName}
                </div>

                <div class="wish-message">
                    “${safeMessage}”
                </div>

                ${
                    wish.photo_url
                    ? `
                        <div style="margin-top:14px">
                            <img
                                src="${escapeHtml(wish.photo_url)}"
                                alt="${safeName}"
                                style="
                                    width:180px;
                                    height:130px;
                                    object-fit:cover;
                                    border-radius:10px;
                                "
                            >
                        </div>
                    `
                    : ""
                }

                <div class="reply-box">

                    <textarea
                        id="reply-${wish.id}"
                        placeholder="Write a personal reply..."
                    ></textarea>

                    <button
                        class="reply-button"
                        onclick="sendReply('${wish.id}')"
                    >
                        💌 Reply Personally
                    </button>

                </div>

                <div
                    id="replies-${wish.id}"
                ></div>

            </article>
        `;

    }).join("");


    loadReplies();
}


async function loadReplies() {

    if (!wishes.length) {
        return;
    }


    const wishIds =
        wishes.map(wish => wish.id);


    const {
        data,
        error
    } = await supabaseClient
        .from("wish_replies")
        .select("*")
        .in("wish_id", wishIds)
        .eq(
            "birthday_person_id",
            currentUser.id
        )
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error(
            "Could not load replies:",
            error
        );

        return;
    }


    const replies = data || [];


    document.getElementById(
        "replyCount"
    ).textContent = replies.length;


    replies.forEach(reply => {

        const box =
            document.getElementById(
                `replies-${reply.wish_id}`
            );


        if (!box) {
            return;
        }


        const safeReply =
            escapeHtml(reply.reply_message);


        box.innerHTML += `
            <div class="existing-reply">
                ↳ ${safeReply}
            </div>
        `;
    });
}


async function sendReply(wishId) {

    const textarea =
        document.getElementById(
            `reply-${wishId}`
        );


    const message =
        textarea.value.trim();


    if (!message) {

        alert(
            "Please write something first."
        );

        return;
    }


    const {
        error
    } = await supabaseClient
        .from("wish_replies")
        .insert({
            wish_id: wishId,
            birthday_person_id: currentUser.id,
            reply_message: message
        });


    if (error) {

        console.error(
            "Reply error:",
            error
        );

        alert(
            "Could not send your reply."
        );

        return;
    }


    textarea.value = "";


    alert(
        "Your personal reply has been saved. ❤️"
    );


    await loadWishes();
}


function openBook() {

    window.location.href =
        "index.html";
}


function downloadBook() {

    alert(
        "Digital book download will be connected next."
    );
}


async function logout() {

    await supabaseClient.auth.signOut();

    sessionStorage.clear();

    window.location.href =
        "birthday-login.html";
}


function escapeHtml(value) {

    return String(value).replace(
        /[&<>'"]/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[character])
    );
}


initializeDashboard();