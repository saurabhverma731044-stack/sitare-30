// ==========================================
// SITARE 30 — public birthday book
// Needs: config.js (loaded before this file)
// ==========================================

let events = [];
let currentEvent = null;
let book = null;
let pages = [];
let current = 0;
let isSaving = false;
let manageData = null;

const MY_WISHES_KEY = "sitare30_my_wishes";
const PHOTO_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
};

// ==========================================
// WISHES WRITTEN ON THIS DEVICE
// (private codes saved so the author can edit
//  without pasting the code again)
// ==========================================

function getMyWishes() {
    try {
        return JSON.parse(localStorage.getItem(MY_WISHES_KEY) || "{}");
    } catch {
        return {};
    }
}

function rememberWish(id, token) {
    try {
        const all = getMyWishes();
        all[id] = token;
        localStorage.setItem(MY_WISHES_KEY, JSON.stringify(all));
    } catch { /* storage can be blocked; the code is still shown */ }
}

function forgetWish(id) {
    try {
        const all = getMyWishes();
        delete all[id];
        localStorage.setItem(MY_WISHES_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
}

// ==========================================
// LOAD EVENTS AND CHOOSE ONE
// ?event=slug  -> that birthday (open or archived)
// no slug      -> today's open birthday, else the newest archive
// ==========================================

async function loadEvents() {
    const { data, error } = await supabaseClient
        .from("birthday_events")
        .select(`
            id, slug, birthday_person_name, birthday_date, year,
            cover_message, is_active, opens_at, closes_at, require_approval
        `)
        .order("birthday_date", { ascending: false });

    if (error) throw error;

    events = data || [];
}

function pickEvent(slug) {
    if (slug) {
        return events.find(event => event.slug === slug) || null;
    }

    const listed = events.filter(event => event.is_active);

    return (
        listed.find(event => eventStatus(event) === "open") ||
        listed.find(event => eventStatus(event) === "archived") ||
        listed[0] ||
        null
    );
}

function showEventError(message) {
    document.getElementById("birthdayName").textContent = "Birthday Archive";
    document.getElementById("coverMessage").textContent = message;
    document.getElementById("coverHint").textContent = "";
    document.getElementById("addWishBtn").hidden = true;
}

// ==========================================
// EVENT UI (cover, banner, other birthdays)
// ==========================================

function updateBirthdayUI() {
    document.getElementById("birthdayName").textContent =
        currentEvent.birthday_person_name || "Birthday Star";

    document.getElementById("coverMessage").textContent =
        currentEvent.cover_message || "Today is your page in our story.";

    document.title =
        `${currentEvent.birthday_person_name} • SITARE 30 Birthday Archive`;
}

function updateStatusUI() {
    const status = eventStatus(currentEvent);
    const banner = document.getElementById("statusBanner");
    const addButton = document.getElementById("addWishBtn");
    const closedNote = document.getElementById("closedNote");

    let text = "";

    if (status === "open") {
        text =
            `🎂 Wishes are open until ${formatDateTime(currentEvent.closes_at)}. ` +
            "After that, this book becomes a read-only archive.";
    } else if (status === "upcoming") {
        text = `⏳ Wishes open on ${formatDateTime(currentEvent.opens_at)}.`;
    } else {
        text = "📚 Archive: wishes for this birthday are closed. You can still read every page.";
    }

    banner.textContent = text;
    banner.className = `status-banner ${status}`;
    banner.hidden = false;

    addButton.hidden = status !== "open";
    closedNote.hidden = status === "open";

    closedNote.textContent =
        status === "upcoming"
            ? "Wishes are not open yet."
            : "Wishes are closed. This birthday is now part of the archive.";
}

function renderEventStrip() {
    const strip = document.getElementById("eventStrip");

    const list = events.filter(
        event => event.is_active || event.id === currentEvent.id
    );

    strip.innerHTML = list.map(event => `
        <a class="event-chip ${event.id === currentEvent.id ? "active" : ""}"
           href="?event=${encodeURIComponent(event.slug)}">
            <span>${escapeHtml(event.birthday_person_name)}</span>
            <small>${STATUS_LABEL[eventStatus(event)]}</small>
        </a>
    `).join("");

    strip.hidden = list.length < 2;
}

// ==========================================
// BOOK SETUP, STACKING AND NAVIGATION
// ==========================================

function initializeBookElements() {
    book = document.getElementById("book");

    const initialPages = Array.from(book.querySelectorAll(":scope > .page"));

    pages = [initialPages[0], initialPages[initialPages.length - 1]];

    updatePageStack();
}

function updatePageStack() {
    pages.forEach((page, index) => {
        page.style.setProperty("--z", pages.length - index);
    });
}

function render() {
    if (!pages.length) return;

    pages.forEach((page, index) => {
        page.classList.toggle("flipped", index < current);
    });

    const progress = document.getElementById("progress");

    let label = "MEMORY PAGE";

    if (current === 0) label = "COVER";
    else if (current === pages.length - 1) label = "THE STORY CONTINUES";

    progress.textContent = `${label} • ${current + 1} / ${pages.length}`;
}

function nextPage() {
    if (current < pages.length - 1) {
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

// ==========================================
// MODAL HELPERS
// ==========================================

function openM(id) {
    const modal = document.getElementById(id);

    modal.classList.add("open");

    modal.querySelector("input, textarea")?.focus();
}

function closeM(id) {
    document.getElementById(id)?.classList.remove("open");
}

// ==========================================
// BUILD ONE WISH PAGE
// ==========================================

function addWishPage(wish, replies, reaction) {
    if (pages.some(page => page.dataset.wishId === String(wish.id))) return;

    const birthdayName = currentEvent.birthday_person_name || "Birthday Star";
    const safeBirthday = escapeHtml(birthdayName);
    const safeName = escapeHtml(wish.sender_name || "Classmate");
    const token = getMyWishes()[wish.id];

    const photoHTML = wish.photo_url
        ? `<img class="wish-photo" src="${escapeHtml(wish.photo_url)}" alt="Photo from ${safeName}" loading="lazy">`
        : `<div class="person-photo">💌</div>`;

    const reactionHTML = reaction && REACTIONS[reaction]
        ? `<div class="reaction-badge">${REACTIONS[reaction]} <span>${safeBirthday} reacted</span></div>`
        : "";

    const repliesHTML = (replies || []).map(reply => `
        <div class="reply-bubble">
            <strong>${safeBirthday} replied</strong>
            <p>${escapeHtml(reply.reply_message)}</p>
        </div>
    `).join("");

    const ownerHTML = token
        ? `<div class="owner-actions">
               <button type="button" class="mini-btn" data-act="manage">✏️ Edit or delete my wish</button>
           </div>`
        : "";

    const page = document.createElement("section");

    page.className = "page person-page dynamic-wish-page";
    page.dataset.wishId = String(wish.id);

    page.innerHTML = `
        <div class="page-inner">
            <div class="person-layout">

                ${photoHTML}

                <div class="wish-content">
                    <div class="chapter">A NEW PAGE FROM ${safeName.toUpperCase()}</div>

                    <h2>For ${safeBirthday}</h2>

                    <p class="quote">“${escapeHtml(wish.message)}”</p>

                    <div class="from">
                        ${safeName} • Classmate${wish.edited_at ? " • edited" : ""}
                    </div>

                    ${reactionHTML}
                    ${repliesHTML}
                    ${ownerHTML}
                </div>

            </div>

            <div class="page-number">MEMORY</div>
        </div>
    `;

    page.querySelector('[data-act="manage"]')
        ?.addEventListener("click", () => openManage(token));

    book.insertBefore(page, pages[pages.length - 1]);

    pages.splice(pages.length - 1, 0, page);

    updatePageStack();
}

// ==========================================
// LOAD WISHES (+ the birthday person's replies and reactions)
// ==========================================

async function loadWishes({ keepPosition = false } = {}) {
    const previous = current;

    book.querySelectorAll(".dynamic-wish-page").forEach(page => page.remove());

    pages = [pages[0], pages[pages.length - 1]];

    try {
        const { data: wishes, error } = await supabaseClient
            .from("wishes")
            .select("id, event_id, sender_name, message, photo_url, created_at, edited_at")
            .eq("event_id", currentEvent.id)
            .eq("approved", true)
            .order("created_at", { ascending: true });

        if (error) throw error;

        const repliesByWish = {};
        const reactionByWish = {};
        const ids = (wishes || []).map(wish => wish.id);

        if (ids.length) {
            const [replyResult, reactionResult] = await Promise.all([
                supabaseClient
                    .from("wish_replies")
                    .select("wish_id, reply_message, created_at")
                    .in("wish_id", ids)
                    .order("created_at", { ascending: true }),
                supabaseClient
                    .from("wish_reactions")
                    .select("wish_id, reaction")
                    .in("wish_id", ids)
            ]);

            if (replyResult.error) console.warn("Replies not loaded:", replyResult.error);
            if (reactionResult.error) console.warn("Reactions not loaded:", reactionResult.error);

            (replyResult.data || []).forEach(reply => {
                (repliesByWish[reply.wish_id] ||= []).push(reply);
            });

            (reactionResult.data || []).forEach(item => {
                reactionByWish[item.wish_id] = item.reaction;
            });
        }

        (wishes || []).forEach(wish => {
            addWishPage(wish, repliesByWish[wish.id], reactionByWish[wish.id]);
        });

        const hint = document.getElementById("coverHint");

        hint.textContent = (wishes || []).length
            ? "Open the book →"
            : eventStatus(currentEvent) === "open"
                ? "No pages yet. Be the first to write one →"
                : "No wishes were added for this birthday.";

        current = keepPosition ? Math.min(previous, pages.length - 1) : 0;

        updatePageStack();
        render();

    } catch (error) {
        console.error("Could not load wishes:", error);

        toast("Could not load the wishes. Check your internet and refresh the page.");
    }
}

// ==========================================
// ADD A WISH
// ==========================================

async function addWish() {
    if (!currentEvent || eventStatus(currentEvent) !== "open") {
        toast("Wishes are not open for this birthday.");
        return;
    }

    if (isSaving) return;

    const nameInput = document.getElementById("name");
    const messageInput = document.getElementById("message");
    const photoInput = document.getElementById("photo");
    const button = document.getElementById("submitWishBtn");

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !message) {
        toast("Please enter your name and your message.");
        return;
    }

    isSaving = true;
    button.disabled = true;
    button.textContent = "Saving your page... ✨";

    try {
        let photoUrl = null;

        const file = photoInput.files?.[0] || null;

        if (file) {
            const extension = PHOTO_TYPES[file.type];

            if (!extension) {
                throw new Error("Photo must be a JPG, PNG, WebP or GIF image.");
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Photo must be smaller than 5 MB.");
            }

            const path = `wishes/${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabaseClient
                .storage
                .from(PHOTO_BUCKET)
                .upload(path, file, { upsert: false, contentType: file.type });

            if (uploadError) throw uploadError;

            photoUrl = supabaseClient
                .storage
                .from(PHOTO_BUCKET)
                .getPublicUrl(path).data.publicUrl;
        }

        const { data, error } = await supabaseClient.rpc("submit_wish", {
            p_event_id: currentEvent.id,
            p_name: name,
            p_message: message,
            p_photo_url: photoUrl
        });

        if (error) throw error;

        rememberWish(data.id, data.delete_token);

        closeM("modal");

        nameInput.value = "";
        messageInput.value = "";
        photoInput.value = "";

        document.getElementById("codeBox").textContent = data.delete_token;

        document.getElementById("successText").textContent = data.approved
            ? "Your page has been added to the book."
            : "Your wish was submitted and is waiting for admin approval.";

        openM("successModal");

        if (data.approved) {
            await loadWishes();

            const index = pages.findIndex(
                page => page.dataset.wishId === String(data.id)
            );

            if (index > 0) current = index;

            render();
        }

    } catch (error) {
        console.error("Wish error:", error);

        toast(error.message || "Something went wrong. Please try again.");

    } finally {
        isSaving = false;
        button.disabled = false;
        button.textContent = "Add My Page to the Book ✨";
    }
}

async function copyCode() {
    const code = document.getElementById("codeBox").textContent;

    try {
        await navigator.clipboard.writeText(code);
        toast("Code copied.");
    } catch {
        toast("Could not copy automatically. Please select and copy the code.");
    }
}

// ==========================================
// EDIT OR DELETE MY WISH (using the private code)
// ==========================================

function setManageMessage(text) {
    document.getElementById("manageMessage").textContent = text || "";
}

function openManage(token = "") {
    manageData = null;

    document.getElementById("manageStep1").hidden = false;
    document.getElementById("manageStep2").hidden = true;
    document.getElementById("manageCode").value = token;

    setManageMessage("");
    openM("manageModal");

    if (token) findMyWish();
}

async function findMyWish() {
    const token = document.getElementById("manageCode").value.trim();

    if (!token) {
        setManageMessage("Please enter your private code.");
        return;
    }

    setManageMessage("Looking for your wish...");

    const { data, error } = await supabaseClient.rpc("get_my_wish", {
        secret_token: token
    });

    if (error) {
        console.error(error);
        setManageMessage(error.message || "Could not check the code.");
        return;
    }

    if (!data) {
        setManageMessage("No wish found for this code. Check it and try again.");
        return;
    }

    manageData = { ...data, token };

    document.getElementById("editName").value = data.sender_name;
    document.getElementById("editMessage").value = data.message;

    document.getElementById("manageInfo").textContent = data.is_open
        ? `Your wish for ${data.birthday_person_name}. Change it below.`
        : `Your wish for ${data.birthday_person_name}. This birthday is archived, so you can only delete it now.`;

    document.getElementById("saveEditBtn").disabled = !data.is_open;
    document.getElementById("editName").disabled = !data.is_open;
    document.getElementById("editMessage").disabled = !data.is_open;

    document.getElementById("manageStep1").hidden = true;
    document.getElementById("manageStep2").hidden = false;

    setManageMessage("");
}

async function saveMyWish() {
    if (!manageData) return;

    const name = document.getElementById("editName").value.trim();
    const message = document.getElementById("editMessage").value.trim();

    if (!name || !message) {
        setManageMessage("Name and message cannot be empty.");
        return;
    }

    const { data, error } = await supabaseClient.rpc("edit_my_wish", {
        secret_token: manageData.token,
        p_name: name,
        p_message: message
    });

    if (error || !data) {
        console.error(error);
        setManageMessage(error?.message || "Could not save your changes.");
        return;
    }

    closeM("manageModal");
    toast("Your wish has been updated.");

    await loadWishes({ keepPosition: true });
}

async function deleteMyWish() {
    if (!manageData) return;

    if (!confirm("Delete your wish permanently? This cannot be undone.")) return;

    const { data, error } = await supabaseClient.rpc("delete_my_wish", {
        secret_token: manageData.token
    });

    if (error) {
        console.error(error);
        setManageMessage(error.message || "Could not delete the wish.");
        return;
    }

    if (!data) {
        setManageMessage("Nothing was deleted. The code did not match any wish.");
        return;
    }

    forgetWish(manageData.id);

    closeM("manageModal");
    toast("Your wish has been deleted.");

    await loadWishes({ keepPosition: true });
}

// ==========================================
// KEYBOARD AND MODAL EVENTS
// ==========================================

function setupEvents() {
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) modal.classList.remove("open");
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            document.querySelectorAll(".modal.open")
                .forEach(modal => modal.classList.remove("open"));
            return;
        }

        const target = event.target;

        const isTyping =
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable;

        if (isTyping || document.querySelector(".modal.open")) return;

        if (event.key === "ArrowRight") nextPage();
        if (event.key === "ArrowLeft") prevPage();
    });
}

// ==========================================
// START
// ==========================================

async function initializeBook() {
    initializeBookElements();
    setupEvents();

    try {
        await loadEvents();
    } catch (error) {
        console.error("Could not load events:", error);
        showEventError("The archive could not be reached. Check your internet and refresh.");
        render();
        return;
    }

    const slug = new URLSearchParams(window.location.search).get("event");

    currentEvent = pickEvent(slug);

    if (!currentEvent) {
        showEventError(
            slug
                ? "No birthday archive exists for this link. Please check the link."
                : "No birthday archive is available yet."
        );
        render();
        return;
    }

    updateBirthdayUI();
    updateStatusUI();
    renderEventStrip();

    await loadWishes();
}

initializeBook();