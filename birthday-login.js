const SUPABASE_URL =
    "https://lfuputokddumahgvpnoy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_cB406lyCNd-4Sc93dzwNOQ_Z-ztN067";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");


function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}


loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    errorMessage.style.display = "none";

    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    if (!email || !password) {
        showError("Please enter your email and password.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Opening your archive...";


    try {

        const {
            data,
            error
        } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });


        if (error) {
            throw error;
        }


        if (!data.user) {
            throw new Error("Login could not be completed.");
        }


        /*
         * IMPORTANT:
         * The logged-in user must actually be
         * registered as a birthday student
         * inside birthday_events.
         */

        const {
            data: birthdayEvent,
            error: eventError
        } = await supabaseClient
            .from("birthday_events")
            .select("id, birthday_person_name, birthday_date")
            .eq("birthday_person_id", data.user.id)
            .eq("is_active", true)
            .maybeSingle();


        if (eventError) {
            throw eventError;
        }


        if (!birthdayEvent) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "This account is not registered as a birthday student."
            );
        }


        sessionStorage.setItem(
            "birthday_event_id",
            birthdayEvent.id
        );


        sessionStorage.setItem(
            "birthday_person_name",
            birthdayEvent.birthday_person_name
        );


        window.location.href = "birthday-dashboard.html";

    } catch (error) {

        console.error("Birthday login error:", error);

        showError(
            error.message ||
            "Login failed. Please try again."
        );

        loginButton.disabled = false;
        loginButton.textContent =
            "Open My Birthday Archive";
    }

});