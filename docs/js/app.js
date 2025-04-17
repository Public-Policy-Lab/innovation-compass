var leaveCheck = true;

document.addEventListener("DOMContentLoaded", function () {
	quizApp.init();
	window.addEventListener("beforeunload", (event) => {
		if (leaveCheck) {
			// Cancel the event as stated by the standard.
			event.preventDefault();
			// Chrome requires returnValue to be set.
			event.returnValue = "";
		}
	});
});

const quizApp = {
	hooks: {},
	quiz: null,
	blocks: null,
	sections: {},
	currentFrame: 0,
	currentBlock: 0,
	blockKeys: [],
	activities: [],
	baseUrl: "https://public-policy-lab.github.io/innovation-compass/",
	currentDateTime: null,
	gid: null,
	participantId: null,

	init: function () {
		if (window.location.hostname != "www.innovationcompass.io") {
			this.baseUrl = "./";
		}

		this.injectHtml().then(() => {
			this.initHooks();
			this.loadAllData();
			toggleApp.init();
		});

		gtag("get", "G-H3ZP0XQ757", "client_id", (client_id) => {
			this.gid = client_id;
		});
	},

	checkToken: function () {
		var token = this.getQueryVariable("r");
		if (!token) {
			return;
		}

		this.participantId = this.getQueryVariable("pid");

		var answers = token.split(".");
		var answers_array = [];
		for (var i = 0; i < answers.length; i++) {
			var parts = answers[i].split("-");
			answers_array[parts[0]] = parts[1];
		}

		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				this.quiz[index].answer = answers_array[index];
			}
		});

		if (token) {
			this.doCalculations();
		}
	},

	getQueryVariable: function (variable) {
		var query = window.location.hash.substring(1);
		var vars = query.split("&");
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			if (decodeURIComponent(pair[0]) == variable) {
				return decodeURIComponent(pair[1]);
			}
		}
		console.log("Query variable %s not found", variable);
	},

	initHooks: function () {
		// Containers
		this.hooks.containers = {
			quiz: document.querySelector("[data-quiz-container]"),
		};

		// Headlines
		this.hooks.headlines = {
			quizTitle: document.querySelector("[data-quiz-title-headline]"),
			quizQuestion: document.querySelector("[data-quiz-question-headline]"),
		};

		// Summary modal
		this.hooks.summaryModal = document.querySelector("[data-summary-modal]");
		this.hooks.summaryModal.addEventListener("click", (event) => {
			if (event.target === this.hooks.summaryModal) {
				this.hideSummaryModal();
			}
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				this.hideSummaryModal();
			}
		});
		this.hooks.summaryModalCloseButton = this.hooks.summaryModal.querySelector("[data-summary-modal-close-button]");
		this.hooks.summaryModalCloseButton.addEventListener("click", () => {
			this.hideSummaryModal();
		});

		// Templates
		this.hooks.templates = {
			start: document.querySelector("[data-template-start]"),
			question: document.querySelector("[data-template-question]"),
			title: document.querySelector("[data-template-title]"),
			results: document.querySelector("[data-template-results]"),
			slide: {
				intro: document.querySelector("[data-slide-intro]"),
				single: document.querySelector("[data-slide-single]"),
				eyebrow: document.querySelector("[data-slide-eyebrow]"),
				title: document.querySelector("[data-slide-title]"),
				body: document.querySelector("[data-slide-body]"),
				practices: document.querySelector("[data-slide-practices]"),
				priority: document.querySelector("[data-slide-priority]"),
			},
			activities: document.querySelector("[data-activities]"),
		};

		// Buttons
		this.hooks.buttons = {
			start: document.querySelector("[data-start-button]"),
			nextFrame: document.querySelectorAll("[data-next-frame-button]"),
			prevFrame: document.querySelectorAll("[data-prev-frame-button]"),
			begin: document.querySelector("[data-begin-button]"),
			slideshow: document.querySelector("[data-slideshow-buttons]"),
			nextBlock: document.querySelector("[data-next-block-button]"),
			prevBlock: document.querySelector("[data-prev-block-button]"),
			info: document.querySelector("[data-info-button]"),
			share: document.querySelector("[data-share-button]"),
			sort: {
				select: document.querySelector("[data-sort-select]"),
			},
			view: {
				list: document.querySelector("[data-view-list-button]"),
				grid: document.querySelector("[data-view-grid-button]"),
			},
		};

		this.hooks.buttons.start.addEventListener("click", () => {
			this.startQuiz();
		});
		this.hooks.buttons.nextFrame.forEach((item) => {
			item.addEventListener("click", () => {
				this.nextFrame();
			});
		});
		this.hooks.buttons.prevFrame.forEach((item) => {
			item.addEventListener("click", () => {
				this.prevFrame();
			});
		});
		this.hooks.buttons.begin.addEventListener("click", () => {
			this.setActivityButtonsState("slideshow");
		});
		this.hooks.buttons.nextBlock.addEventListener("click", () => {
			this.nextBlock();
		});
		this.hooks.buttons.prevBlock.addEventListener("click", () => {
			this.prevBlock();
		});
		this.hooks.buttons.info.addEventListener("click", () => {
			this.showSummaryModal();
		});
		this.hooks.buttons.share.addEventListener("click", () => {
			this.copyShareUrl();
		});
		this.hooks.buttons.sort.select.addEventListener("change", () => {
			const selectedOption = this.hooks.buttons.sort.select.value;
			this.sortActivities(selectedOption);
		});
		this.hooks.buttons.view.list.addEventListener("click", () => {
			this.viewActivitiesAsList();
		});
		this.hooks.buttons.view.grid.addEventListener("click", () => {
			this.viewActivitiesAsGrid();
		});

		// Content
		this.hooks.questionHeadline = document.querySelector("[data-question-headline]");
		this.hooks.questionBlurb = document.querySelector("[data-question-blurb]");

		this.hooks.titleHeadline = document.querySelector("[data-title-headline]");
		this.hooks.titleBlurb = document.querySelector("[data-title-blurb]");

		this.hooks.category = {
			body: document.querySelector("[data-category-body]"),
			number: document.querySelector("[data-category-number]"),
		};
		this.hooks.progress = {
			bar: document.querySelector("[data-progress-bar-fill]"),
			percent: document.querySelector("[data-progress-percent]"),
		};

		// Hands
		this.hooks.hands = document.querySelectorAll("[data-hand]");
		this.hooks.hands_labels = document.querySelectorAll("[data-hand-label]");

		// Errors
		this.hooks.errorMessage = document.querySelector("[data-error-message]");

		// For keys 1-5, add an event listener that will select the answer
		for (let i = 1; i <= 5; i++) {
			document.addEventListener("keydown", function (event) {
				if (event.key === i.toString()) {
					const question = document.querySelector(`[data-answer-${i - 1}]`);
					if (question) {
						question.checked = true;
					}
				}
			});
		}

		// Secret keyboard shortcut: Shift + C
		document.addEventListener("keydown", function (event) {
			// Detect if Shift and 'C' are pressed together
			if (event.key === "C" && event.shiftKey) {
				quizApp.createCSVDownload();
			}
		});
	},

	skipToResults: function () {
		// Dev function
		// Loop through the quiz and randomly
		// asssign an answer value from 1 - 5
		this.quiz.forEach((item) => {
			if (item.weighting) {
				item.answer = Math.floor(Math.random() * 5);
			}
		});
		this.finishQuiz();
	},

	startQuiz: function () {
		this.hideElement(this.hooks.templates.start);
		this.showElement(this.hooks.templates.question);
		this.renderFrame();

		// Scroll to top
		window.scrollTo(0, 0);
	},

	prevFrame: function () {
		if (this.currentFrame > 0) {
			this.currentFrame--;
			this.renderFrame();
		}

		// Scroll to top
		window.scrollTo(0, 0);
	},

	nextFrame: function () {
		// Get current answer from radio buttons
		const frame = this.quiz[this.currentFrame];

		if (frame.weighting) {
			const answer = document.querySelector("[data-answer]:checked");
			if (answer) {
				this.quiz[this.currentFrame].answer = answer.value;

				// Check to see if current frame is the last frame
				if (this.currentFrame === this.quiz.length - 1) {
					this.finishQuiz();
					return;
				}

				this.currentFrame++;

				this.renderFrame();
			} else {
				document.querySelectorAll("[data-answer]").forEach((answer) => {
					answer.classList.add("has--error");
				});
				this.hooks.errorMessage.classList.remove("hidden");
			}
		} else {
			this.currentFrame++;
			this.renderFrame();
		}

		// Scroll to top
		window.scrollTo(0, 0);
	},

	setActivityButtonsState: function (state) {
		if (state === "slideshow") {
			this.hideElement(this.hooks.buttons.begin);
			this.showElement(this.hooks.buttons.slideshow);
			this.showElement(this.hooks.buttons.info);
			this.nextBlock();
		} else {
			this.showElement(this.hooks.buttons.begin);
			this.hideElement(this.hooks.buttons.slideshow);
			this.hideElement(this.hooks.buttons.info);
			this.currentBlock = 0;
			this.renderBlock();
		}
	},

	showSummaryModal: function () {
		this.showElement(this.hooks.summaryModal);
	},

	hideSummaryModal: function () {
		this.hideElement(this.hooks.summaryModal);
	},

	prevBlock: function () {
		if (this.currentBlock > 1) {
			this.currentBlock--;
		} else {
			this.currentBlock = this.blockKeys.length;
		}

		this.renderBlock();
	},

	nextBlock: function () {
		if (this.currentBlock < this.blockKeys.length) {
			this.currentBlock++;
		} else {
			this.currentBlock = 1;
		}
		this.renderBlock();
	},

	copyShareUrl: function () {
		const url = window.location.href;
		navigator.clipboard.writeText(url).then(
			function () {
				console.log("Copied!");
				alert("Results link copied to clipboard!");
			},
			function (err) {
				console.error("Could not copy: ", err);
			}
		);
	},

	createCSVDownload: function () {
		let rows = [];

		// Add the header row
		let headerRow = ["GID"];

		// Add PID to the header row
		headerRow.push("PID");

		// Add datetime to the header row
		headerRow.push("datetime");

		// Add a column for each question to the header row
		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				headerRow.push('"' + item.activity_name + '"');
			}
		});

		// Add the header row to the rows array
		rows.push(headerRow);

		// Add the data row
		let dataRow = [];

		// Add the GID to the data row
		dataRow.push(this.gid);

		// Add the PID to the data row
		dataRow.push(this.participantId);

		// Add the datetime to the data row
		dataRow.push(this.currentDateTime);

		// Add the answers to the data row
		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				dataRow.push(item.answer);
			}
		});

		// Add the data row to the rows array
		rows.push(dataRow);

		// Loop through all rows matching header with data and displaying them as a pair
		rows[0].forEach((item, index) => {
			console.log(item, rows[1][index]);
		});

		// Convert the rows array to a CSV string
		let csvContent = "data:text/csv;charset=utf-8,";
		rows.forEach(function (rowArray) {
			let row = rowArray.join(",");
			csvContent += row + "\r\n";
		});

		// Encode the CSV string
		var encodedUri = encodeURI(csvContent);

		// Create a link and click it to download the file
		var link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "user_data.csv");
		document.body.appendChild(link); // Required for FF
		link.click(); // This will download the data file named "user_data.csv".
		document.body.removeChild(link);
	},

	renderFrame: function () {
		// Remove error classes
		document.querySelectorAll("[data-answer]").forEach((answer) => {
			answer.classList.remove("has--error");
		});
		// Hide error message
		this.hooks.errorMessage.classList.add("hidden");

		// Render the frame
		if (this.currentFrame < this.quiz.length) {
			const frame = this.quiz[this.currentFrame];
			if (frame.weighting) {
				// If the frame is a question
				this.renderQuestion(frame);
			} else {
				this.renderTitle(frame);
			}
		} else {
			// If the quiz is finished
			this.hideElement(this.hooks.templates.question);
			this.hideElement(this.hooks.templates.title);
			this.showElement(this.hooks.templates.results);
		}
	},

	renderQuestion: function (frame) {
		this.hideElement(this.hooks.templates.title);
		this.showElement(this.hooks.templates.question);

		this.hooks.questionHeadline.innerHTML = frame.activity_name;
		this.hooks.questionBlurb.innerHTML = frame.blurb;

		this.hooks.category.body.innerHTML = frame.category;
		this.hooks.category.number.innerHTML = this.getSectionNumber() + " of " + Object.keys(this.sections).length;

		let percentage = ((this.getSectionProgress() + 1) / this.sections[frame.category]) * 100;
		this.hooks.progress.bar.style.width = percentage + "%";
		this.hooks.progress.percent.innerHTML = Math.round(percentage) + "%";

		const existingAnswer = this.quiz[this.currentFrame].answer;
		if (existingAnswer) {
			document.querySelector("[data-answer-" + existingAnswer + "]").checked = true;
		} else {
			let checked_answer = document.querySelector("[data-answer]:checked");
			if (checked_answer) {
				checked_answer.checked = false;
			}
		}

		// Set the theme
		this.setTheme(frame.category, "question");

		// Trigger GA event
		gtag("event", "page_view", {
			page_path: "/quiz/step/" + this.currentFrame,
			page_title: "Question: " + frame.activity_name,
			page_location: window.location.href + "/step/" + this.currentFrame,
		});
	},

	renderTitle: function (frame) {
		this.hideElement(this.hooks.templates.question);
		this.showElement(this.hooks.templates.title);
		this.hooks.titleHeadline.innerHTML = frame.activity_name;
		this.hooks.titleBlurb.innerHTML = frame.blurb;

		// Set the theme
		this.setTheme(frame.category, "title");

		// Trigger GA event
		gtag("event", "page_view", {
			page_path: "/quiz/step/" + this.currentFrame,
			page_title: frame.activity_name,
			page_location: window.location.href + "quiz/step/" + this.currentFrame,
		});
	},

	renderResults: function () {
		this.hideElement(this.hooks.templates.start);
		this.hideElement(this.hooks.templates.question);
		this.hideElement(this.hooks.templates.title);
		this.showElement(this.hooks.templates.results);

		this.hooks.hands.forEach((hand) => {
			hand.addEventListener("click", () => {
				// Make sure slideshow buttons are visible
				this.setActivityButtonsState("slideshow");

				this.hooks.hands.forEach((hand) => {
					hand.classList.remove("is--focused");
				});

				hand.classList.add("is--focused");

				// Get the selected hand and set the current block
				const selectedHandId = hand.getAttribute("data-hand-block-id");
				for (let block in this.blocks) {
					if (block === selectedHandId) {
						this.currentBlock = this.blockKeys.indexOf(block) + 1;
						this.renderBlock();
					}
				}

				// Set the relevant hand label to focused
				this.hooks.hands_labels.forEach((hand_label) => {
					hand_label.classList.remove("is--focused");
					const handBlockId = hand_label.getAttribute("data-hand-label-id");
					if (handBlockId === selectedHandId) {
						hand_label.classList.add("is--focused");
					}
				});
			});
		});

		this.hooks.hands_labels.forEach((hand_label) => {
			hand_label.addEventListener("click", () => {
				// Make sure slideshow buttons are visible
				this.setActivityButtonsState("slideshow");

				// Set the relevant hand label to focused
				this.hooks.hands_labels.forEach((hand_label) => {
					hand_label.classList.remove("is--focused");
				});

				hand_label.classList.add("is--focused");

				// Get index
				const index = hand_label.getAttribute("data-hand-index-id");
				this.currentBlock = index * 1 + 1;
				this.renderBlock();
			});
		});

		// Loop through the blocks and render the results
		for (let block in this.blocks) {
			const hand = document.querySelector("[data-hand-block-id='" + block + "']");
			const average = this.blocks[block].average;
			const reach = Math.floor(this.scaleValue(average, 0, 12, 1, 12));

			if (hand) {
				hand.setAttribute("data-hand-reach", reach);
			}
		}

		// Set the theme (default)
		this.setTheme(null, null);

		// Trigger GA event
		gtag("event", "page_view", {
			page_path: "/results",
			page_title: "Results",
			page_location: window.location.href + "results",
		});
	},

	renderBlock: function () {
		if (this.currentBlock == 0) {
			this.hideElement(this.hooks.templates.slide.single);
			this.showElement(this.hooks.templates.slide.intro);
			this.hooks.hands.forEach((hand) => {
				hand.classList.remove("is--focused");
			});
			this.hooks.hands_labels.forEach((hand_label) => {
				hand_label.classList.remove("is--focused");
			});
		} else {
			this.hideElement(this.hooks.templates.slide.intro);
			this.showElement(this.hooks.templates.slide.single);

			// Get the current block
			const actualIndex = this.currentBlock - 1;
			const block = this.blocks[this.blockKeys[actualIndex]];

			// Get the practices
			const practices = this.blocks[this.blockKeys[actualIndex]].items;
			let practicesHtml = "";
			practices.forEach((practice) => {
				practicesHtml += `<li><a href="${practice.activity_url}" target="_blank">${practice.activity_name}</a></li>`;
			});

			// Output the practices
			this.hooks.templates.slide.practices.innerHTML = practicesHtml;

			// Output eyebrow
			this.hooks.templates.slide.eyebrow.innerHTML = block.category;

			// Remove any existing text-color classes
			this.hooks.templates.slide.eyebrow.classList.remove("text-purple", "text-green", "text-orange");

			// Set the text-color class based on category
			switch (block.category) {
				case "Impact":
					this.hooks.templates.slide.eyebrow.classList.add("text-purple");
					break;
				case "Community":
					this.hooks.templates.slide.eyebrow.classList.add("text-green");
					break;
				case "Entrepreneurship":
					this.hooks.templates.slide.eyebrow.classList.add("text-orange");
					break;
			}

			// Output title, body
			this.hooks.templates.slide.title.innerHTML = block.title;
			this.hooks.templates.slide.body.innerHTML = block.description;

			// Output the priority
			switch (block.priority) {
				case "low":
					this.hooks.templates.slide.priority.innerHTML = `<span class="level level--inline level--low"></span>`;
					break;
				case "medium":
					this.hooks.templates.slide.priority.innerHTML = `<span class="level level--inline level--medium"></span>`;
					break;
				case "high":
					this.hooks.templates.slide.priority.innerHTML = `<span class="level level--inline level--high"></span>`;
					break;
				default:
					this.hooks.templates.slide.priority.innerHTML = `<span class="level level--inline level--unknown"></span>`;
					break;
			}

			// Set the relevant hand to be focused
			this.hooks.hands.forEach((hand) => {
				hand.classList.remove("is--focused");

				const handBlockId = hand.getAttribute("data-hand-block-id");
				if (handBlockId === this.blockKeys[actualIndex]) {
					hand.classList.add("is--focused");
				}
			});

			// Set the relevant hand label to focused
			this.hooks.hands_labels.forEach((hand_label) => {
				hand_label.classList.remove("is--focused");
				const handBlockId = hand_label.getAttribute("data-hand-label-id");
				if (handBlockId === this.blockKeys[actualIndex]) {
					hand_label.classList.add("is--focused");
				}
			});
		}
	},

	setTheme: function (category, type) {
		const colors = {
			purple: "#5D62F4",
			purpleLight: "#DFE0FD",
			red: "#E76446",
			redLight: "#FAE0DA",
			green: "#3B817E",
			greenLight: "#D0DEDD",
		};

		switch (category + "-" + type) {
			case "community-title":
				this.hooks.containers.quiz.style.background = colors.green;
				this.hooks.headlines.quizTitle.style.color = colors.greenLight;
				this.hooks.progress.bar.style.background = colors.green;
				break;
			case "community-question":
				this.hooks.containers.quiz.style.background = colors.greenLight;
				this.hooks.headlines.quizQuestion.style.color = colors.green;
				this.hooks.progress.bar.style.background = colors.green;
				break;
			case "entrepreneurship-title":
				this.hooks.containers.quiz.style.background = colors.red;
				this.hooks.headlines.quizTitle.style.color = colors.redLight;
				this.hooks.progress.bar.style.background = colors.red;
				break;
			case "entrepreneurship-question":
				this.hooks.containers.quiz.style.background = colors.redLight;
				this.hooks.headlines.quizQuestion.style.color = colors.red;
				this.hooks.progress.bar.style.background = colors.red;
				break;
			case "impact-title":
				this.hooks.containers.quiz.style.background = colors.purple;
				this.hooks.headlines.quizTitle.style.color = colors.purpleLight;
				this.hooks.progress.bar.style.background = colors.purple;
				break;
			case "impact-question":
				this.hooks.containers.quiz.style.background = colors.purpleLight;
				this.hooks.headlines.quizQuestion.style.color = colors.purple;
				this.hooks.progress.bar.style.background = colors.purple;
				break;
			default:
				this.hooks.containers.quiz.style.background = "#fff";
				break;
		}
	},

	loadAllData: async function () {
		const urls = {
			quiz: this.baseUrl + "data/quiz.json",
			blocks: this.baseUrl + "data/blocks.json",
		};

		try {
			const responses = await Promise.all(
				Object.entries(urls).map(async ([key, url]) => {
					const response = await fetch(url);
					const data = await response.json();
					return [key, data];
				})
			);

			const result = Object.fromEntries(responses);
			this.quiz = result.quiz;
			this.blocks = result.blocks;
			this.makeSections();
			this.checkToken();
			return true;
		} catch (error) {
			console.error("Error fetching data:", error);
			throw error;
		}
	},

	makeSections: function () {
		let sections = {};
		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				if (!sections[item.category]) {
					sections[item.category] = 0;
				}
				sections[item.category]++;
			}
		});
		this.sections = sections;
	},

	getSectionProgress: function () {
		// Go through each question to determine the progress
		let sectionProgress = 0;
		for (let i = 0; i < this.currentFrame; i++) {
			if (this.quiz[i].weighting) {
				sectionProgress++;
			} else {
				sectionProgress = 0;
			}
		}
		return sectionProgress - 1;
	},

	getSectionNumber: function () {
		let sectionNumber = 0;
		for (let i = 0; i < this.currentFrame; i++) {
			if (!this.quiz[i].weighting) {
				sectionNumber++;
			}
		}
		return sectionNumber;
	},

	hideElement: function (element) {
		element.classList.add("hidden");
	},

	showElement: function (element) {
		element.classList.remove("hidden");
	},

	finishQuiz: function () {
		this.doCalculations();
		this.buildShareableURL();
	},

	doCalculations: function () {
		this.quiz.forEach((item) => {
			if (item.weighting) {
				item.priority = item.answer * item.weighting;
				item.priority_name = this.getPriority(item.priority);
				item.preparedness = this.getPreparedness(item.answer);
				this.blocks[item.building_block].items.push(item);
			}
		});

		// Calculate the average for each block
		for (let block in this.blocks) {
			let total = 0;
			this.blocks[block].items.forEach((item) => {
				total += item.priority;
			});
			this.blocks[block].average = total / this.blocks[block].items.length;
			// Round
			this.blocks[block].average = Math.round(this.blocks[block].average);
		}

		// Add proficiency to the blocks
		for (let block in this.blocks) {
			this.blocks[block].priority = this.getProficiency(this.blocks[block].average);
		}

		this.blockKeys = Object.keys(this.blocks);

		// Render
		this.renderResults();

		// Build activities
		this.buildActivities();
	},

	buildActivities: function () {
		// Clear the activities
		this.activities = [];

		// Clear the activities
		this.hooks.templates.activities.innerHTML = "";

		// Create activities list
		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				item.block_priority = this.blocks[item.building_block].priority;
				item.title = this.blocks[item.building_block].title;
				this.activities.push(item);
			}
		});

		// Get the sort option
		const sortOption = this.hooks.buttons.sort.select.value;

		// Sort activities
		switch (sortOption) {
			case "level-low-to-high":
				this.activities.sort(this.prioritySortAscending);
				break;
			case "level-high-to-low":
				this.activities.sort(this.prioritySortDescending);
				break;
			case "building-blocks":
				this.activities.sort(this.categorySort);
				break;
		}

		let previousCategory = "";
		let activityGroupHTML = "";
		let activityHTML = "";

		// Build activities
		this.activities.forEach((activity, index) => {
			if (sortOption === "building-blocks" && activity.category !== previousCategory) {
				// Build the activity group
				activityGroupHTML = this.buildActivityGroup(activity);
				// Insert the activity group
				this.hooks.templates.activities.insertAdjacentHTML("beforeend", activityGroupHTML);
				// Set the previous building block
				previousCategory = activity.category;
			}

			// Build the activity
			activityHTML = this.buildActivity(activity);
			// this.hooks.templates.activities.innerHTML += html;
			// Using innerHTML means that any JavaScript references to the descendants of element will be removed.
			// The insertAdjacentHTML method does not reparse the element it is invoked on, so it does not corrupt the element.
			this.hooks.templates.activities.insertAdjacentHTML("beforeend", activityHTML);
		});

		// Initialize all tooltips
		tooltipApp.init();
	},

	buildActivityGroup: function (activity) {
		// Set the header class
		let header_class = "";
		switch (activity.category) {
			case "impact":
				header_class = "text-purple";
				break;
			case "community":
				header_class = "text-green";
				break;
			default:
				header_class = "text-orange";
				break;
		}

		// Capitalize the first letter of the category
		const category = activity.category.charAt(0).toUpperCase() + activity.category.slice(1);

		return `<h2 class="activities__group-title ${header_class}">${category}</h2>`;
	},

	buildActivity: function (activity) {
		const priority = this.getPriority(activity.priority);

		// Set priority icon
		let priority_icon = "";
		switch (priority) {
			case "high":
				priority_icon = `<span class="level level--high"></span>`;
				break;
			case "medium":
				priority_icon = `<span class="level level--medium"></span>`;
				break;
			case "low":
				priority_icon = `<span class="level level--low"></span>`;
				break;
		}

		// Set the header class
		let header_class = "";
		switch (activity.category) {
			case "impact":
				header_class = "text-purple";
				break;
			case "community":
				header_class = "text-green";
				break;
			default:
				header_class = "text-orange";
				break;
		}

		const html = `
		<div class="activity">
			<a class="activity__inner" href="${activity.activity_url}" target="_blank">
				<div class="activity__header">
					<div class="activity__eyebrow ${header_class}">${activity.title}</div>
					<h3 class="activity__title">
						${activity.activity_name}
						<span class="activity__title__link-icon"></span>
					</h3>
				</div>
				<div class="activity__priority">${priority_icon}</div>
				<div class="activity__link">					
					<button class="button" target="_blank">Go To Practice</button>
				</div>
			</a>
		</div>
		`;

		return html;
	},

	prioritySortDescending: function (a, b) {
		if (a.priority < b.priority) {
			return -1;
		}
		if (a.priority > b.priority) {
			return 1;
		}
		return 0;
	},

	prioritySortAscending: function (a, b) {
		if (a.priority > b.priority) {
			return -1;
		}
		if (a.priority < b.priority) {
			return 1;
		}
		return 0;
	},

	preparednessSort: function (a, b) {
		if (a.answer < b.answer) {
			return -1;
		}
		if (a.answer > b.answer) {
			return 1;
		}
		return 0;
	},

	buildingBlockSort: function (a, b) {
		if (a.building_block < b.building_block) {
			return -1;
		}
		return 1;
	},

	categorySort: function (a, b) {
		// There are 3 categories: impact, community, entrepreneurship
		// We want to sort them in the order of community, impact, entrepreneurship
		const categories = ["community", "impact", "entrepreneurship"];
		const aIndex = categories.indexOf(a.category);
		const bIndex = categories.indexOf(b.category);
		return aIndex - bIndex;
	},

	getProficiency: function (score) {
		if (score <= 1) {
			return "low";
		} else if (score <= 3) {
			return "medium";
		} else {
			return "high";
		}
	},

	getPriority: function (score) {
		if (score <= 1) {
			return "high";
		} else if (score <= 3) {
			return "medium";
		} else {
			return "low";
		}
	},

	getPreparedness: function (answer) {
		if (answer == 0) {
			return "unprepared";
		} else if (answer == 1) {
			return "somewhat_prepared";
		} else if (answer == 2) {
			return "adequately_prepared";
		} else if (answer == 3) {
			return "very_prepared";
		} else if (answer == 4) {
			return "extremely_prepared";
		} else {
			return "unknown_prepareness";
		}
	},

	sortActivities: function (selectedOption) {
		console.log(selectedOption);
		switch (selectedOption) {
			case "level-low-to-high":
				this.activities.sort(this.prioritySort);
				break;
			case "level-high-to-low":
				this.activities.sort(this.prioritySort);
				break;
			case "building-blocks":
				this.activities.sort(this.buildingBlockSort);
				break;
		}

		// Rebuild the activities
		this.buildActivities();
	},
	viewActivitiesAsList: function () {
		this.hooks.templates.activities.classList.remove("activities__body--grid");
		this.hooks.templates.activities.classList.add("activities__body--list");
	},

	viewActivitiesAsGrid: function () {
		this.hooks.templates.activities.classList.remove("activities__body--list");
		this.hooks.templates.activities.classList.add("activities__body--grid");
	},

	injectHtml: function () {
		return fetch(this.baseUrl + "templates.html")
			.then((res) => res.text())
			.then((text) => {
				// Inject the HTML
				let containerNode = document.getElementById("quiz-container");
				containerNode.innerHTML = text;
			})
			.catch((e) => console.error(e));
	},

	buildShareableURL: function () {
		this.currentDateTime = this.getUrlFriendlyDate();

		let token = "";

		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				token += index + "-" + item.answer + ".";
			}
		});

		token = token.slice(0, -1);
		token += "";

		// get participant ID from cookie
		const participant_id = this.getCookie("participant_id");

		searchParams = new URLSearchParams();
		searchParams.set("r", token);
		searchParams.set("datetime", this.currentDateTime);
		searchParams.set("gid", this.gid);
		searchParams.set("pid", participant_id);
		window.location = "#" + searchParams.toString();
	},

	getUrlFriendlyDate: function () {
		const now = new Date();

		// Format date
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
		const day = String(now.getDate()).padStart(2, "0");

		// Format time
		const hours24 = String(now.getHours()).padStart(2, "0");
		let hours = hours24 % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");
		const ampm = hours24 >= 12 ? "pm" : "am";

		return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${ampm}`;
	},

	triggerGAEvent: function (category, action, label) {
		if (gtag === undefined) {
			return;
		}

		gtag("event", action, {
			event_category: category,
			event_label: label,
		});
	},

	getCookie: function (name) {
		// get cookie
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(";").shift();
	},

	scaleValue: function (value, oldMin, oldMax, newMin, newMax) {
		return ((value - oldMin) / (oldMax - oldMin)) * (newMax - newMin) + newMin;
	},
};

const toggleApp = {
	init: function () {
		const toggles = document.querySelectorAll("[data-toggle]");
		toggles.forEach((toggle) => {
			toggle.addEventListener("click", (e) => {
				e.preventDefault();

				// toggle the toggles is-open class
				toggle.classList.toggle("toggle--is-open");

				// get the target
				const target = toggle.getAttribute("data-toggle");
				const targetElements = document.querySelectorAll(`[data-toggle-target="${target}"]`);

				// toggle the target is-open class
				targetElements.forEach((element) => {
					element.classList.toggle("toggle__target--is-open");
				});
			});
		});
	},
};

const tooltipApp = {
	init: function () {
		const tooltips = document.querySelectorAll("[data-tooltip]");
		const showEvents = ["mouseover", "focus"];
		const hideEvents = ["mouseout", "blur"];
		// For each tooltip
		tooltips.forEach((tooltip) => {
			// Bind show tooltip events
			showEvents.forEach((event) => {
				tooltip.addEventListener(event, (e) => {
					e.preventDefault();
					this.showTooltip(tooltip);
				});
			});

			// Bind hide tooltip events
			hideEvents.forEach((event) => {
				tooltip.addEventListener(event, (e) => {
					e.preventDefault();
					this.hideTooltip(tooltip);
				});
			});
		});
	},

	showTooltip: function (tooltip) {
		const tooltipContent = tooltip.querySelector("[data-tooltip-content]");
		tooltipContent.classList.remove("hidden");
	},

	hideTooltip: function (tooltip) {
		const tooltipContent = tooltip.querySelector("[data-tooltip-content]");
		tooltipContent.classList.add("hidden");
	},
};
