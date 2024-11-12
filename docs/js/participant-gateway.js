document.addEventListener("DOMContentLoaded", function () {
	participantGateway.init();
});

const participantGateway = {
	config: {
		prefix: "ic",
	},
	init: function () {
		// if the URL contains "#r="
		if (window.location.hash.includes("#r=")) {
			return;
		}

		// check if user has already seen the modal
		const alreadySeen = participantGateway.checkCookie("participant_id");
		if (alreadySeen) {
			return;
		}

		// create modal HTML element
		const modal = document.createElement("div");
		modal.id = "participantGatewayModal";
		modal.className = "modal";
		modal.innerHTML = `
      <div class="modal">
        <div class="modal__background" style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.4); z-index: 50;">
          <div class="modal__content" style="position: relative; max-height: 98vh; overflow-y: auto; background-color: white; border: 1px solid; padding: 24px; margin: 0 24px; max-width: 590px; width: 100%;">
            <div style="">
              <h1 style="font-family: 'GT Planar'; font-size: 24px; font-weight: 500; line-height: 30px; color: #042159; margin: 0 0 24px 0;">The content and format of this site are in development.</h1>
              <label for="participant-gateway" style="font-family: 'GT Planar'; font-size: 18px; font-weight: 300; line-height: 22px; color: #042159; margin: 0 0 15px 0;">
                We are using participant IDs to track usage of this site by pilot participants.
              </label>
              <input 
                class="text-field w-input" 
                autofocus="true" 
                maxlength="256" 
                name="participant-gateway" 
                placeholder="Participant ID" 
                type="password" 
                id="participant-gateway">
              <input type="submit" class="button  w-button" value="Enter With Participant ID">
              <div data-error-message style="display: none;">
                <div style="margin-top: 10px; font-family: 'GT Planar'; font-size: 12px; font-weight: 300; line-height: 13.8px; letter-spacing: 0.05em; color: #C4291C;">Please enter a valid ID to enter with participant ID</div>
              </div>
              <div class="" style="margin-top: 80px; border-top: 2px dotted;">
                <div data-no-id-link class="" style="cursor: pointer; height: 44px; display: inline-flex; align-items: center;">
                	<p style="margin-top: 12px; font-family: 'GT Planar'; font-size: 18px; font-weight: 300; line-height: 20.7px; text-decoration: underline;">I don't have a Participant ID</p>
              	</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

		this.openModal(modal);

		// get modal element
		const modalEl = document.getElementById("participantGatewayModal");

		// get input element
		const input = modalEl.querySelector("input[type=password]");

		// get submit button
		const submitBtn = modalEl.querySelector("input[type=submit]");

		// get error message element
		const errorMessage = modalEl.querySelector("[data-error-message]");

		// add input event listener to input
		input.addEventListener("input", function () {
			// remove border color style
			input.style.borderColor = "";
			// hide error message
			errorMessage.style.display = "none";
		});

		// add keydown event listener to input
		input.addEventListener("keydown", function (e) {
			// check if enter key is pressed
			if (e.key === "Enter") {
				submitBtn.click();
			}
		});

		// add event listener to "I don't have a Participant ID" link
		const noIdLink = modalEl.querySelector("[data-no-id-link]");
		noIdLink.addEventListener("click", function () {
			// remove cookie
			participantGateway.setCookie("participant_id", "guest");
			// close modal
			participantGateway.closeModal(modalEl);
		});

		// add event listener to submit button
		submitBtn.addEventListener("click", function () {
			const inputVal = input.value.split("-");

			// check if input value is correct
			if (inputVal.length == 2 && inputVal[0] === participantGateway.config.prefix && !isNaN(inputVal[1])) {
				const participant_id = inputVal[1];
				// set cookie
				participantGateway.setCookie("participant_id", participant_id);
				// close modal
				participantGateway.closeModal(modalEl);
			} else {
				// clear input value
				input.value = "";
				// set input error state
				input.style.borderColor = "#e76446";
				// show error message
				errorMessage.style.display = "block";
			}
		});
	},

	checkCookie: function (name) {
		// check if cookie exists
		return document.cookie.includes(`${name}=`);
	},

	setCookie: function (name, value) {
		// set cookie
		document.cookie = `${name}=${value}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/;`;
	},

	removeCookie: function (name) {
		// remove cookie
		document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
	},

	getCookie: function (name) {
		// get cookie
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(";").shift();
	},

	openModal: function (modal) {
		// append modal to body
		document.body.appendChild(modal);

		// Prevent scrolling on the body when the modal is open
		document.body.style.overflow = "hidden";
	},

	closeModal: function (modal) {
		// remove modal from body
		modal.remove();

		// Allow scrolling on the body when the modal is closed
		document.body.style.overflow = "";
	},
};
