// ==========================================
// SITARE 30 — birthday student dashboard
// Needs: config.js (loaded before this file)
// ==========================================

let currentUser = null;
let myEvents = [];
let birthdayEvent = null;
let wishes = [];
let repliesByWish = {};
let reactionByWish = {};

const $ = id => document.getElementById(id);

function showNotice(message, type = "") {
    const box = $("notice");

    box.textContent = message;
    box.className = `notice ${type}`;
}

// ------------------------------------------
// START
// ------------------------------------------

async function initializeDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "birthday-login.html";
        return;
    }

    currentUser = user;

    const { data, error } = await supabaseClient
        .from("birthday_events")
        .select("id, slug, birthday_person_name, birthday_date, cover_message, opens_at, closes_at")
        .eq("birthday_person_id", user.id)
        .order("birthday_date", { ascending: false });

    if (error) {
        console.error(error);
        showNotice("Could not load your birthday archive. Please refresh.", "error");
        return;
    }

    if (!data || !data.length) {
        await supabaseClient.auth.signOut();
        alert("This account is not registered as a birthday student.");
        window.location.href = "birthday-login.html";
        return;
    }

    myEvents = data;

    // A student with more than one birthday archive (different years) can switch.
    if (myEvents.length > 1) {
        $("eventSelect").innerHTML = myEvents.map(event => `
            <option value="${escapeHtml(event.id)}">
                ${escapeHtml(event.birthday_person_name)} • ${escapeHtml(formatDate(event.birthday_date))}
            </option>
        `).join("");

        $("eventPicker").classList.remove("hidden");
    }

    selectEvent(myEvents[0].id);
}

function selectEvent(eventId) {
    birthdayEvent = myEvents.find(event => event.id === eventId);

    $("welcomeTitle").textContent = `Happy Birthday, ${birthdayEvent.birthday_person_name}`;
    $("openBookLink").href = `index.html?event=${encodeURIComponent(birthdayEvent.slug)}`;
    $("eventStatus").textContent = STATUS_LABEL[eventStatus(birthdayEvent)];

    loadWishes();
}

// ------------------------------------------
// LOAD WISHES, REPLIES, REACTIONS
// ------------------------------------------

async function loadWishes() {
    const { data, error } = await supabaseClient
        .from("wishes")
        .select("id, sender_name, message, photo_url, created_at, edited_at")
        .eq("event_id", birthdayEvent.id)
        .eq("approved", true)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        $("wishList").innerHTML = `<div class="empty">Could not load wishes. Please refresh.</div>`;
        return;
    }

    wishes = data || [];
    repliesByWish = {};
    reactionByWish = {};

    if (wishes.length) {
        const ids = wishes.map(wish => wish.id);

        const [replyResult, reactionResult] = await Promise.all([
            supabaseClient
                .from("wish_replies")
                .select("id, wish_id, reply_message, created_at")
                .in("wish_id", ids)
                .eq("birthday_person_id", currentUser.id)
                .order("created_at", { ascending: true }),
            supabaseClient
                .from("wish_reactions")
                .select("wish_id, reaction")
                .in("wish_id", ids)
                .eq("birthday_person_id", currentUser.id)
        ]);

        if (replyResult.error) console.error("Replies:", replyResult.error);
        if (reactionResult.error) console.error("Reactions:", reactionResult.error);

        (replyResult.data || []).forEach(reply => {
            (repliesByWish[reply.wish_id] ||= []).push(reply);
        });

        (reactionResult.data || []).forEach(item => {
            reactionByWish[item.wish_id] = item.reaction;
        });
    }

    renderWishes();
}

// ------------------------------------------
// DRAW THE WISH CARDS
// ------------------------------------------

function renderWishes() {
    const container = $("wishList");

    // Keep half-written replies when the list is redrawn.
    const drafts = {};

    container.querySelectorAll("textarea[data-draft]").forEach(box => {
        drafts[box.dataset.draft] = box.value;
    });

    $("totalWishes").textContent = wishes.length;
    $("photoWishes").textContent = wishes.filter(wish => wish.photo_url).length;
    $("replyCount").textContent =
        Object.values(repliesByWish).reduce((sum, list) => sum + list.length, 0);

    if (!wishes.length) {
        container.innerHTML = `
            <div class="empty">
                <div style="font-size:35px">💌</div>
                No wishes have arrived yet. Share your book link with the class.
            </div>`;
        return;
    }

    container.innerHTML = wishes.map(wish => {
        const safeName = escapeHtml(wish.sender_name);
        const chosen = reactionByWish[wish.id];

        const reactionButtons = Object.entries(REACTIONS).map(([key, emoji]) => `
            <button type="button"
                    class="reaction-btn ${chosen === key ? "active" : ""}"
                    data-action="react" data-wish="${wish.id}" data-key="${key}"
                    aria-pressed="${chosen === key}" aria-label="React ${key}">${emoji}</button>
        `).join("");

        const replies = (repliesByWish[wish.id] || []).map(reply => `
            <div>
                <div class="existing-reply">↳ ${escapeHtml(reply.reply_message)}</div>
                <div class="reply-actions">
                    <button type="button" class="btn small" data-action="edit-reply" data-reply="${reply.id}">Edit</button>
                    <button type="button" class="btn small danger" data-action="delete-reply" data-reply="${reply.id}">Delete</button>
                </div>
            </div>
        `).join("");

        return `
            <article class="wish-card">
                ${wish.photo_url
                    ? `<img class="wish-photo" src="${escapeHtml(wish.photo_url)}" alt="Photo from ${safeName}" loading="lazy">`
                    : ""}
                <div class="wish-body">
                    <div class="wish-meta">
                        <strong>${safeName}</strong>
                        <span>${escapeHtml(formatDateTime(wish.created_at))}${wish.edited_at ? " • edited" : ""}</span>
                    </div>

                    <p class="wish-message">“${escapeHtml(wish.message)}”</p>

                    <div class="reaction-bar" role="group" aria-label="Your reaction">${reactionButtons}</div>

                    <div class="reply-thread">${replies}</div>

                    <div class="reply-box">
                        <textarea data-draft="${wish.id}" maxlength="500"
                                  placeholder="Write a personal reply to ${safeName}..."></textarea>
                        <button type="button" class="btn primary small"
                                data-action="reply" data-wish="${wish.id}">💌 Send reply</button>
                    </div>
                </div>
            </article>`;
    }).join("");

    container.querySelectorAll("textarea[data-draft]").forEach(box => {
        if (drafts[box.dataset.draft]) box.value = drafts[box.dataset.draft];
    });
}

// ------------------------------------------
// REACTIONS AND REPLIES
// ------------------------------------------

async function setReaction(wishId, key) {
    const same = reactionByWish[wishId] === key;

    const request = same
        ? supabaseClient.from("wish_reactions").delete()
            .eq("wish_id", wishId)
            .eq("birthday_person_id", currentUser.id)
        : supabaseClient.from("wish_reactions").upsert(
            { wish_id: wishId, birthday_person_id: currentUser.id, reaction: key },
            { onConflict: "wish_id,birthday_person_id" }
        );

    const { error } = await request;

    if (error) {
        console.error(error);
        toast("Could not save your reaction.");
        return;
    }

    if (same) delete reactionByWish[wishId];
    else reactionByWish[wishId] = key;

    renderWishes();
}

async function sendReply(wishId) {
    const box = document.querySelector(`textarea[data-draft="${wishId}"]`);
    const message = box.value.trim();

    if (!message) {
        toast("Please write something first.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("wish_replies")
        .insert({
            wish_id: wishId,
            birthday_person_id: currentUser.id,
            reply_message: message
        })
        .select("id, wish_id, reply_message, created_at")
        .single();

    if (error) {
        console.error(error);
        toast("Could not send your reply. " + (error.message || ""));
        return;
    }

    (repliesByWish[wishId] ||= []).push(data);

    box.value = "";
    renderWishes();
    toast("Reply saved. It now appears in the book. ❤️");
}

async function editReply(replyId) {
    let reply = null;

    Object.values(repliesByWish).forEach(list => {
        reply = list.find(item => String(item.id) === replyId) || reply;
    });

    if (!reply) return;

    const updated = prompt("Edit your reply:", reply.reply_message);

    if (updated === null) return;

    const message = updated.trim();

    if (!message) {
        toast("A reply cannot be empty. Use Delete to remove it.");
        return;
    }

    const { error } = await supabaseClient
        .from("wish_replies")
        .update({ reply_message: message })
        .eq("id", replyId)
        .eq("birthday_person_id", currentUser.id);

    if (error) {
        console.error(error);
        toast("Could not update the reply.");
        return;
    }

    reply.reply_message = message;
    renderWishes();
}

async function deleteReply(replyId) {
    if (!confirm("Delete this reply?")) return;

    const { error } = await supabaseClient
        .from("wish_replies")
        .delete()
        .eq("id", replyId)
        .eq("birthday_person_id", currentUser.id);

    if (error) {
        console.error(error);
        toast("Could not delete the reply.");
        return;
    }

    Object.keys(repliesByWish).forEach(wishId => {
        repliesByWish[wishId] = repliesByWish[wishId].filter(item => String(item.id) !== replyId);
    });

    renderWishes();
}

// ------------------------------------------
// BUTTON EVENTS
// ------------------------------------------

$("wishList").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, wish, key, reply } = button.dataset;

    if (action === "react") setReaction(wish, key);
    if (action === "reply") sendReply(wish);
    if (action === "edit-reply") editReply(reply);
    if (action === "delete-reply") deleteReply(reply);
});

$("eventSelect").addEventListener("change", event => selectEvent(event.target.value));

$("refreshBtn").addEventListener("click", async () => {
    await loadWishes();
    toast("Wishes refreshed.");
});

$("logoutBtn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "birthday-login.html";
});

initializeDashboard();