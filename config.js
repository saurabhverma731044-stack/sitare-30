// ==========================================
// SITARE 30 — shared settings and helpers
// Loaded by index.html, birthday-dashboard.html and admin.html
// (after the Supabase library, before the page's own script)
// ==========================================

const SUPABASE_URL = "https://lfuputokddumahgvpnoy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_cB406lyCNd-4Sc93dzwNOQ_Z-ztN067";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const PHOTO_BUCKET = "birthday-photos";

// The birthday person's reactions (keys are stored in the database).
const REACTIONS = {
    heart: "❤️",
    love: "🥰",
    laugh: "😂",
    party: "🎉",
    teary: "🥹",
    thanks: "🙏"
};

const STATUS_LABEL = {
    open: "Wishes open",
    archived: "Archive",
    upcoming: "Coming soon"
};

// open = wishes can be written, archived = read-only, upcoming = not started
function eventStatus(event) {
    if (!event || !event.opens_at || !event.closes_at) return "archived";

    const now = Date.now();

    if (now < new Date(event.opens_at).getTime()) return "upcoming";
    if (now >= new Date(event.closes_at).getTime()) return "archived";

    return "open";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    })[character]);
}

function formatDateTime(iso) {
    if (!iso) return "";

    return new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatDate(value) {
    if (!value) return "";

    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// Small message at the bottom of the screen (replaces most alert() popups).
function toast(message, duration = 3800) {
    const element = document.createElement("div");

    element.className = "toast";
    element.setAttribute("role", "status");
    element.textContent = message;

    document.body.appendChild(element);

    setTimeout(() => element.classList.add("show"), 10);

    setTimeout(() => {
        element.classList.remove("show");
        setTimeout(() => element.remove(), 300);
    }, duration);
}