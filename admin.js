// ==========================================
// SITARE 30 — admin page
// Needs: config.js (loaded before this file)
//
// IMPORTANT: hiding this page is not security.
// The database (Row Level Security + archive_admins)
// decides who may change anything.
// ==========================================

const $ = id => document.getElementById(id);

let events = [];
let editingId = null;
let slugTouched = false;
let wishes = [];
let repliesByWish = {};
let wishesLoadedOnce = false;

// ------------------------------------------
// SIGN IN / SIGN OUT
// ------------------------------------------

async function isAdmin(user) {
    const { data, error } = await supabaseClient
        .from("archive_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    return !error && !!data;
}

function showLogin(message = "") {
    $("adminSection").classList.add("hidden");
    $("loginSection").classList.remove("hidden");

    const box = $("loginError");

    box.textContent = message;
    box.classList.toggle("hidden", !message);
}

async function showPanel(user) {
    $("loginSection").classList.add("hidden");
    $("adminSection").classList.remove("hidden");
    $("adminWho").textContent = user.email || "Admin";

    await loadEvents();
}

$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("loginButton");

    button.disabled = true;
    button.textContent = "Signing in...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: $("adminEmail").value.trim(),
            password: $("adminPassword").value
        });

        if (error) throw error;

        if (!(await isAdmin(data.user))) {
            await supabaseClient.auth.signOut();
            throw new Error("This account is not an archive admin.");
        }

        $("adminPassword").value = "";

        await showPanel(data.user);

    } catch (error) {
        console.error("Admin login:", error);
        showLogin(error.message || "Sign in failed.");

    } finally {
        button.disabled = false;
        button.textContent = "Sign in";
    }
});

$("signOutBtn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

async function initializeAdmin() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user && await isAdmin(user)) {
        await showPanel(user);
    } else {
        showLogin();
    }
}

// ------------------------------------------
// TABS
// ------------------------------------------

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => {
            item.classList.toggle("active", item === tab);
        });

        $("tab-events").classList.toggle("hidden", tab.dataset.tab !== "events");
        $("tab-wishes").classList.toggle("hidden", tab.dataset.tab !== "wishes");

        if (tab.dataset.tab === "wishes" && !wishesLoadedOnce) {
            wishesLoadedOnce = true;
            loadWishes();
        }
    });
});

// ------------------------------------------
// EVENTS
// ------------------------------------------

function slugify(text) {
    return text
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toLocalInput(date) {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return shifted.toISOString().slice(0, 16);
}

function fillDefaultTimes() {
    const value = $("evDate").value;

    if (!value) return;

    const start = new Date(`${value}T00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    $("evOpens").value = toLocalInput(start);
    $("evCloses").value = toLocalInput(end);
}

async function loadEvents() {
    const { data, error } = await supabaseClient
        .from("birthday_events")
        .select(`
            id, slug, birthday_person_name, birthday_date, year, cover_message,
            is_active, birthday_person_id, opens_at, closes_at, require_approval
        `)
        .order("birthday_date", { ascending: false });

    if (error) {
        console.error(error);
        $("eventsList").innerHTML = `<div class="empty">Could not load events: ${escapeHtml(error.message)}</div>`;
        return;
    }

    events = data || [];

    renderEvents();
    fillEventSelect();
}

function renderEvents() {
    if (!events.length) {
        $("eventsList").innerHTML = `<div class="empty">No events yet. Create the first one.</div>`;
        return;
    }

    $("eventsList").innerHTML = events.map(event => {
        const status = eventStatus(event);

        return `
            <div class="row-card">
                <div>
                    <h3>${escapeHtml(event.birthday_person_name)}</h3>
                    <div class="meta">
                        ${escapeHtml(formatDate(event.birthday_date))} •
                        <code>${escapeHtml(event.slug)}</code><br>
                        Wishes: ${escapeHtml(formatDateTime(event.opens_at))} → ${escapeHtml(formatDateTime(event.closes_at))}
                    </div>
                    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                        <span class="chip ${status === "open" ? "good" : ""}">${STATUS_LABEL[status]}</span>
                        <span class="chip ${event.birthday_person_id ? "good" : "warn"}">
                            ${event.birthday_person_id ? "Student linked" : "No student linked"}
                        </span>
                        <span class="chip">${event.is_active ? "Listed" : "Hidden from list"}</span>
                        ${event.require_approval ? `<span class="chip warn">Needs approval</span>` : ""}
                    </div>
                </div>

                <div class="row-actions">
                    <button class="btn small" type="button" data-action="edit" data-id="${event.id}">Edit</button>
                    <button class="btn small" type="button" data-action="wishes" data-id="${event.id}">Wishes</button>
                    <button class="btn small" type="button" data-action="copy" data-id="${event.id}">Copy link</button>
                    ${event.birthday_person_id
                        ? `<button class="btn small danger" type="button" data-action="unlink" data-id="${event.id}">Unlink student</button>`
                        : ""}
                </div>
            </div>`;
    }).join("");
}

function openEventForm(event = null) {
    editingId = event ? event.id : null;
    slugTouched = !!event;

    $("eventFormTitle").textContent = event ? "Edit birthday event" : "New birthday event";

    $("evName").value = event?.birthday_person_name || "";
    $("evDate").value = event?.birthday_date ? String(event.birthday_date).slice(0, 10) : "";
    $("evSlug").value = event?.slug || "";
    $("evCover").value = event?.cover_message || "";
    $("evStudent").value = "";
    $("evListed").checked = event ? !!event.is_active : true;
    $("evApproval").checked = event ? !!event.require_approval : false;

    if (event) {
        $("evOpens").value = event.opens_at ? toLocalInput(new Date(event.opens_at)) : "";
        $("evCloses").value = event.closes_at ? toLocalInput(new Date(event.closes_at)) : "";
    } else {
        $("evOpens").value = "";
        $("evCloses").value = "";
    }

    $("slugPreview").textContent = $("evSlug").value || "…";

    $("eventForm").classList.remove("hidden");
    $("evName").focus();
}

function closeEventForm() {
    $("eventForm").classList.add("hidden");
    editingId = null;
}

$("newEventBtn").addEventListener("click", () => openEventForm());
$("cancelEventBtn").addEventListener("click", closeEventForm);
$("evDate").addEventListener("change", fillDefaultTimes);

$("evName").addEventListener("input", () => {
    if (!slugTouched) {
        $("evSlug").value = slugify($("evName").value);
        $("slugPreview").textContent = $("evSlug").value || "…";
    }
});

$("evSlug").addEventListener("input", () => {
    slugTouched = true;
    $("slugPreview").textContent = $("evSlug").value || "…";
});

$("eventForm").addEventListener("submit", async submitEvent => {
    submitEvent.preventDefault();

    const date = $("evDate").value;
    const opens = new Date($("evOpens").value);
    const closes = new Date($("evCloses").value);

    if (!(closes > opens)) {
        toast("The closing time must be after the opening time.");
        return;
    }

    const payload = {
        birthday_person_name: $("evName").value.trim(),
        birthday_date: date,
        year: Number(date.slice(0, 4)),
        slug: slugify($("evSlug").value),
        cover_message: $("evCover").value.trim() || null,
        opens_at: opens.toISOString(),
        closes_at: closes.toISOString(),
        is_active: $("evListed").checked,
        require_approval: $("evApproval").checked
    };

    if (!payload.birthday_person_name || !payload.slug) {
        toast("Name and link name are required.");
        return;
    }

    const button = $("saveEventBtn");

    button.disabled = true;

    try {
        let eventId = editingId;

        if (editingId) {
            const { data, error } = await supabaseClient
                .from("birthday_events")
                .update(payload)
                .eq("id", editingId)
                .select("id");

            if (error) throw error;
            if (!data?.length) throw new Error("Nothing was saved. Are you signed in as an admin?");

        } else {
            const { data, error } = await supabaseClient
                .from("birthday_events")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            eventId = data.id;
        }

        const email = $("evStudent").value.trim();

        if (email) {
            const { error: linkError } = await supabaseClient.rpc("admin_link_student", {
                p_event_id: eventId,
                p_email: email
            });

            if (linkError) {
                toast("Event saved, but linking the student failed: " + linkError.message, 7000);
            }
        }

        toast("Event saved.");
        closeEventForm();
        await loadEvents();

    } catch (error) {
        console.error("Save event:", error);

        toast(
            error.code === "23505"
                ? "That link name is already used. Choose a different one."
                : (error.message || "Could not save the event.")
        );

    } finally {
        button.disabled = false;
    }
});

$("eventsList").addEventListener("click", async click => {
    const button = click.target.closest("[data-action]");

    if (!button) return;

    const event = events.find(item => item.id === button.dataset.id);

    if (!event) return;

    const action = button.dataset.action;

    if (action === "edit") {
        openEventForm(event);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "wishes") {
        wishesLoadedOnce = true;
        $("wishEvent").value = event.id;
        document.querySelector('.tab[data-tab="wishes"]').click();
        loadWishes();
    }

    if (action === "copy") {
        const link = new URL(
            `index.html?event=${encodeURIComponent(event.slug)}`,
            window.location.href
        ).href;

        try {
            await navigator.clipboard.writeText(link);
            toast("Link copied: " + link);
        } catch {
            prompt("Copy this link:", link);
        }
    }

    if (action === "unlink") {
        if (!confirm(`Remove the student login from ${event.birthday_person_name}'s event?`)) return;

        const { error } = await supabaseClient.rpc("admin_link_student", {
            p_event_id: event.id,
            p_email: ""
        });

        if (error) {
            toast(error.message);
            return;
        }

        await loadEvents();
    }
});

// ------------------------------------------
// WISHES
// ------------------------------------------

function fillEventSelect() {
    const previous = $("wishEvent").value;

    $("wishEvent").innerHTML = events.map(event => `
        <option value="${escapeHtml(event.id)}">
            ${escapeHtml(event.birthday_person_name)} • ${escapeHtml(formatDate(event.birthday_date))}
        </option>
    `).join("");

    if (previous && events.some(event => event.id === previous)) {
        $("wishEvent").value = previous;
    }
}

async function loadWishes() {
    const eventId = $("wishEvent").value;

    if (!eventId) {
        $("wishesList").innerHTML = `<div class="empty">Create a birthday event first.</div>`;
        return;
    }

    const { data, error } = await supabaseClient
        .from("wishes")
        .select("id, sender_name, message, photo_url, approved, created_at, edited_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        $("wishesList").innerHTML = `<div class="empty">Could not load wishes: ${escapeHtml(error.message)}</div>`;
        return;
    }

    wishes = data || [];
    repliesByWish = {};

    if (wishes.length) {
        const { data: replies } = await supabaseClient
            .from("wish_replies")
            .select("id, wish_id, reply_message")
            .in("wish_id", wishes.map(wish => wish.id));

        (replies || []).forEach(reply => {
            (repliesByWish[reply.wish_id] ||= []).push(reply);
        });
    }

    renderWishes();
}

function renderWishes() {
    const filter = $("wishFilter").value;

    const list = wishes.filter(wish =>
        filter === "all" ||
        (filter === "pending" && !wish.approved) ||
        (filter === "approved" && wish.approved)
    );

    if (!list.length) {
        $("wishesList").innerHTML = `<div class="empty">No wishes to show here.</div>`;
        return;
    }

    $("wishesList").innerHTML = list.map(wish => `
        <article class="panel admin-wish" data-id="${wish.id}">
            <div class="head">
                <span>
                    <span class="chip ${wish.approved ? "good" : "warn"}">${wish.approved ? "Published" : "Pending"}</span>
                    <span class="chip">${escapeHtml(formatDateTime(wish.created_at))}${wish.edited_at ? " • edited" : ""}</span>
                </span>
            </div>

            ${wish.photo_url
                ? `<img class="thumb" src="${escapeHtml(wish.photo_url)}" alt="Wish photo" loading="lazy">`
                : ""}

            <div class="field" style="margin:0">
                <label>Sender name</label>
                <input type="text" class="w-name" maxlength="60" value="${escapeHtml(wish.sender_name)}">
            </div>

            <div class="field" style="margin:0">
                <label>Message</label>
                <textarea class="w-msg" maxlength="1000">${escapeHtml(wish.message)}</textarea>
            </div>

            ${(repliesByWish[wish.id] || []).map(reply => `
                <div class="existing-reply">
                    Reply: ${escapeHtml(reply.reply_message)}
                    <div class="reply-actions">
                        <button class="btn small danger" type="button" data-action="delete-reply" data-reply="${reply.id}">Delete reply</button>
                    </div>
                </div>
            `).join("")}

            <div class="row-actions">
                <button class="btn small primary" type="button" data-action="save">Save edit</button>
                <button class="btn small" type="button" data-action="toggle">${wish.approved ? "Unpublish" : "Approve"}</button>
                <button class="btn small danger" type="button" data-action="delete">Delete</button>
            </div>
        </article>
    `).join("");
}

function storagePathFromUrl(url) {
    const marker = `/object/public/${PHOTO_BUCKET}/`;
    const index = (url || "").indexOf(marker);

    return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

$("wishesList").addEventListener("click", async click => {
    const button = click.target.closest("[data-action]");

    if (!button) return;

    const card = button.closest("[data-id]");
    const action = button.dataset.action;

    if (action === "delete-reply") {
        if (!confirm("Delete this reply?")) return;

        const { error } = await supabaseClient
            .from("wish_replies")
            .delete()
            .eq("id", button.dataset.reply);

        if (error) toast(error.message);
        else loadWishes();

        return;
    }

    const wish = wishes.find(item => item.id === card?.dataset.id);

    if (!wish) return;

    if (action === "save") {
        const name = card.querySelector(".w-name").value.trim();
        const message = card.querySelector(".w-msg").value.trim();

        if (!name || !message) {
            toast("Name and message cannot be empty.");
            return;
        }

        const { data, error } = await supabaseClient
            .from("wishes")
            .update({ sender_name: name, message, edited_at: new Date().toISOString() })
            .eq("id", wish.id)
            .select("id");

        if (error || !data?.length) {
            toast(error?.message || "Nothing was saved. Are you signed in as an admin?");
            return;
        }

        toast("Wish updated.");
        loadWishes();
    }

    if (action === "toggle") {
        const { data, error } = await supabaseClient
            .from("wishes")
            .update({ approved: !wish.approved })
            .eq("id", wish.id)
            .select("id");

        if (error || !data?.length) {
            toast(error?.message || "Nothing was changed. Are you signed in as an admin?");
            return;
        }

        toast(wish.approved ? "Wish unpublished." : "Wish published.");
        loadWishes();
    }

    if (action === "delete") {
        if (!confirm(`Delete the wish from ${wish.sender_name} permanently?`)) return;

        const { data, error } = await supabaseClient
            .from("wishes")
            .delete()
            .eq("id", wish.id)
            .select("id");

        if (error || !data?.length) {
            toast(error?.message || "Nothing was deleted. Are you signed in as an admin?");
            return;
        }

        // Also remove the photo file (best effort).
        const path = storagePathFromUrl(wish.photo_url);

        if (path) {
            const { error: removeError } = await supabaseClient
                .storage.from(PHOTO_BUCKET).remove([path]);

            if (removeError) console.warn("Photo file not removed:", removeError);
        }

        toast("Wish deleted.");
        loadWishes();
    }
});

$("wishEvent").addEventListener("change", loadWishes);
$("wishFilter").addEventListener("change", renderWishes);
$("reloadWishesBtn").addEventListener("click", loadWishes);

initializeAdmin();