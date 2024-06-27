const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const signUpLink = document.getElementById('signUpLink');
const signInLink = document.getElementById('signInLink');
const container = document.getElementById('container');
const signUpForm = document.getElementById('sign-up-form');
const signInForm = document.getElementById('sign-in-form');

// Below js script is for login_signup_form.html
signUpButton.addEventListener('click',()=>{
    container.classList.add("right-panel-active");
    clearForm(signUpForm);
});

signInButton.addEventListener('click',()=>{
    container.classList.remove("right-panel-active");
    clearForm(signInForm);
});

// signUpLink.addEventListener('click',()=>{
//     container.classList.add("right-panel-active");
//     clearForm(signUpForm);
// });

// signInLink.addEventListener('click',()=>{
//     container.classList.remove("right-panel-active");
//     clearForm(signInForm);
// });

function clearForm(form) {
    const inputs = form.getElementsByTagName('input');
    for (let input of inputs) {
        input.value = '';
    }
}

function myFunction() {
    var x = document.getElementById("myTopnav");
    if (x.className === "topnav") {
      x.className += " responsive";
    } else {
      x.className = "topnav";
    }
}

function clearFeedbackForm() {
    document.getElementById("feedbackTitle").value = "";
    document.getElementById("feedbackDescription").value = "";
}