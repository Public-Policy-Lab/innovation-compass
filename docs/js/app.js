document.addEventListener("DOMContentLoaded", function () {
	quizApp.init();
	// window.addEventListener("beforeunload", (event) => {
	// 	// Cancel the event as stated by the standard.
	// 	event.preventDefault();
	// 	// Chrome requires returnValue to be set.
	// 	event.returnValue = "";
	// });
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

	init: function () {
		if (window.location.hostname != "www.innovationcompass.io") {
			this.baseUrl = "./";
		}

		this.injectHtml().then(() => {
			this.initHooks();
			this.loadAllData();
			this.initTabs();
			this.initFiltersCurated();
			this.initFiltersAll();
			toggleApp.init();
		});
	},

	checkToken: function () {
		var token = this.getQueryVariable("r");
		if (!token) {
			return;
		}

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
			this.finishQuiz();
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
				priority: document.querySelector("[data-slide-priority]"),
			},
			activities: {
				curated: document.querySelector("[data-activities-curated]"),
				all: document.querySelector("[data-activities-all]"),
			},
		};

		// Buttons
		this.hooks.buttons = {
			start: document.querySelector("[data-start-button]"),
			finish: document.querySelector("[data-finish-button]"),
			nextFrame: document.querySelectorAll("[data-next-frame-button]"),
			prevFrame: document.querySelectorAll("[data-prev-frame-button]"),
			nextBlock: document.querySelector("[data-next-block-button]"),
			prevBlock: document.querySelector("[data-prev-block-button]"),
			share: document.querySelector("[data-share-button]"),
		};

		this.hooks.buttons.start.addEventListener("click", () => {
			this.startQuiz();
		});
		this.hooks.buttons.finish.addEventListener("click", () => {
			this.skipToResults();
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
		this.hooks.buttons.nextBlock.addEventListener("click", () => {
			this.nextBlock();
		});
		this.hooks.buttons.prevBlock.addEventListener("click", () => {
			this.prevBlock();
		});
		this.hooks.buttons.share.addEventListener("click", () => {
			this.copyShareUrl();
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

		// Secret keyboard shortcut: Shift + C
		document.addEventListener("keydown", function (event) {
			// Detect if Shift and 'C' are pressed together
			if (event.key === "C" && event.shiftKey) {
				console.log("Shift + C pressed");
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
	},

	prevFrame: function () {
		if (this.currentFrame > 0) {
			this.currentFrame--;
			this.renderFrame();
		}
	},

	nextFrame: function () {
		// Check to see if current frame is the last frame
		if (this.currentFrame === this.quiz.length - 1) {
			this.finishQuiz();
			return;
		}

		// Get current answer from radio buttons
		const frame = this.quiz[this.currentFrame];

		if (frame.weighting) {
			const answer = document.querySelector("[data-answer]:checked");
			if (answer) {
				this.quiz[this.currentFrame].answer = answer.value;
				this.currentFrame++;
				this.renderFrame();
			} else {
				this.hooks.errorMessage.classList.remove("hidden");
			}
		} else {
			this.currentFrame++;
			this.renderFrame();
		}
	},

	prevBlock: function () {
		if (this.currentBlock > 0) {
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
			this.currentBlock = 0;
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
		dataRow.push(GID);

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
	},

	renderTitle: function (frame) {
		this.hideElement(this.hooks.templates.question);
		this.showElement(this.hooks.templates.title);
		this.hooks.titleHeadline.innerHTML = frame.activity_name;
		this.hooks.titleBlurb.innerHTML = frame.blurb;

		// Set the theme
		this.setTheme(frame.category, "title");
	},

	renderResults: function () {
		this.hideElement(this.hooks.templates.start);
		this.hideElement(this.hooks.templates.question);
		this.hideElement(this.hooks.templates.title);
		this.showElement(this.hooks.templates.results);

		this.hooks.hands.forEach((hand) => {
			hand.addEventListener("click", () => {
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
			});
		});

		this.hooks.hands_labels.forEach((hand_label) => {
			hand_label.addEventListener("click", () => {
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

			if (hand && average) {
				hand.setAttribute("data-hand-reach", average);
			}
		}

		// Set the theme (default)
		this.setTheme(null, null);
	},

	renderBlock: function () {
		if (this.currentBlock == 0) {
			this.hideElement(this.hooks.templates.slide.single);
			this.showElement(this.hooks.templates.slide.intro);
			this.hooks.hands.forEach((hand) => {
				hand.classList.remove("is--focused");
			});
		} else {
			this.hideElement(this.hooks.templates.slide.intro);
			this.showElement(this.hooks.templates.slide.single);

			var actualIndex = this.currentBlock - 1;
			// Get the current block
			const block = this.blocks[this.blockKeys[actualIndex]];

			// Set the relevant hand to be focused
			this.hooks.hands.forEach((hand) => {
				hand.classList.remove("is--focused");

				const handBlockId = hand.getAttribute("data-hand-block-id");
				if (handBlockId === this.blockKeys[actualIndex]) {
					hand.classList.add("is--focused");
				}
			});

			// Output data to block
			this.hooks.templates.slide.eyebrow.innerHTML = block.category;
			this.hooks.templates.slide.title.innerHTML = block.title;
			this.hooks.templates.slide.body.innerHTML = block.description;
			this.hooks.templates.slide.priority.innerHTML = block.priority;
		}
	},

	setTheme: function (category, type) {
		switch (category + "-" + type) {
			case "community-title":
				this.hooks.containers.quiz.style.background = "#5D62F4";
				this.hooks.headlines.quizTitle.style.color = "#DFE0FD";
				this.hooks.progress.bar.style.background = "#5D62F4";
				break;
			case "community-question":
				this.hooks.containers.quiz.style.background = "#DFE0FD";
				this.hooks.headlines.quizQuestion.style.color = "#5D62F4";
				this.hooks.progress.bar.style.background = "#5D62F4";
				break;
			case "entrepreneurship-title":
				this.hooks.containers.quiz.style.background = "#E76446";
				this.hooks.headlines.quizTitle.style.color = "#FAE0DA";
				this.hooks.progress.bar.style.background = "#E76446";
				break;
			case "entrepreneurship-question":
				this.hooks.containers.quiz.style.background = "#FAE0DA";
				this.hooks.headlines.quizQuestion.style.color = "#E76446";
				this.hooks.progress.bar.style.background = "#E76446";
				break;
			case "impact-title":
				this.hooks.containers.quiz.style.background = "#3B817E";
				this.hooks.headlines.quizTitle.style.color = "#D0DEDD";
				this.hooks.progress.bar.style.background = "#3B817E";
				break;
			case "impact-question":
				this.hooks.containers.quiz.style.background = "#D0DEDD";
				this.hooks.headlines.quizQuestion.style.color = "#3B817E";
				this.hooks.progress.bar.style.background = "#3B817E";
				break;
			default:
				this.hooks.containers.quiz.style.background = "#fff";
				break;
		}
	},

	loadAllData: async function () {
		const urls = {
			quiz: this.baseUrl + "quiz.json",
			blocks: this.baseUrl + "blocks.json",
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
		this.buildToken();
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

		// Add priority to the blocks
		for (let block in this.blocks) {
			this.blocks[block].priority = this.getPriority(this.blocks[block].average);
		}

		this.blockKeys = Object.keys(this.blocks);

		// Render
		this.renderResults();

		// Build activities
		this.buildActivities();

	},

	buildActivities: function () {
		// Create activities list
		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				item.block_priority = this.blocks[item.building_block].priority;
				item.title = this.blocks[item.building_block].title;
				this.activities.push(item);
			}
		});

		this.activities.sort(this.prioritySort);

		// Build activity groups
		let html = "";
		let previous = {
			priority: 0,
		};

		this.activities.forEach((activity, index) => {
			if (activity.priority_name != previous.priority_name) {
				html = this.buildActivityGroup("curated", activity);
				this.hooks.templates.activities.curated.insertAdjacentHTML("beforeend", html);
			}

			html = this.buildActivity("curated", activity);
			// this.hooks.templates.activities.innerHTML += html;
			// Using innerHTML means that any JavaScript references to the descendants of element will be removed.
			// The insertAdjacentHTML method does not reparse the element it is invoked on, so it does not corrupt the element.
			this.hooks.templates.activities.curated.insertAdjacentHTML("beforeend", html);

			previous = activity;
		});

		this.activities.sort(this.preparednessSort);

		html = "";
		previous = {
			priority: 0,
		};

		this.activities.forEach((activity, index) => {
			if (activity.answer != previous.answer) {
				html = this.buildActivityGroup("all", activity);
				this.hooks.templates.activities.all.insertAdjacentHTML("beforeend", html);
			}

			html = this.buildActivity("all", activity);
			// this.hooks.templates.activities.innerHTML += html;
			// Using innerHTML means that any JavaScript references to the descendants of element will be removed.
			// The insertAdjacentHTML method does not reparse the element it is invoked on, so it does not corrupt the element.
			this.hooks.templates.activities.all.insertAdjacentHTML("beforeend", html);

			previous = activity;
		});

		// Initialize all tooltips
		tooltipApp.init();
	},

	prioritySort: function (a, b) {
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

	getPriority: function (average) {
		if (average <= 3) {
			return "low";
		} else if (average <= 7) {
			return "medium";
		} else {
			return "high";
		}
	},

	getPreparedness: function (answer) {
		if (answer == 1) {
			return "unprepared";
		} else if (answer == 2) {
			return "somewhat_prepared";
		} else if (answer == 3) {
			return "adequately_prepared";
		} else if (answer == 4) {
			return "very_prepared";
		} else if (answer == 5) {
			return "extremely_prepared";
		} else {
			return "unknown_prepareness";
		}
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

	buildActivity: function (type, activity) {
		let priority = this.getPriority(activity.priority);
		let preparedness = this.getPreparedness(activity.answer);
		if (type == "curated") {
			var classes = activity.building_block + " " + priority;
		} else {
			var classes = activity.building_block + " " + preparedness;
		}
		if (activity.category == "impact") {
			var header_class = "text-purple";
		} else if (activity.category == "community") {
			var header_class = "text-green";
		} else {
			var header_class = "text-orange";
		}
		let html = `
			<div
				role="list"
				class="${classes}"
				data-activity-${type}>
				<div
					role="listitem"
					class="collection-item-4 w-dyn-item w-col w-col-4">
					<div
						class="bb-activity-tile-div">
						<div
							class="bb-activity-tile-rounded-border">
							<div
								class="bb-activity-tile-top-grid">
								<div
									class="bb-tag-text block-display ${header_class}">
									${activity.title}
								</div>
								<div
									class="bb-activity-tile-title">
									${activity.activity_name}
								</div>
							</div>
							<a
								href="${activity.activity_url}"
								target="_blank"
								class="button w-inline-block">
								<div
									class="button-text">Go To Activity</div>
							</a>
						</div>
					</div>
				</div>
			</div>`;

		return html;
	},

	buildActivityGroup: function (type, activity) {
		if (type == "curated") {
			var headline = "The following activities are a <strong>" + activity.priority_name + "</strong> recommendation for you";
			var tooltip = "Your chart shows results based on your preparedness level and activity importance, as rated by early-stage innovators and experts.";
			var activity_group_id = activity.priority_name;
		} else {
			// replace underscores with spaces
			preparedness = activity.preparedness.replace(/_/g, " ");
			var headline = "You indicated that you are <strong>" + preparedness + "</strong> for the following activities";
			var tooltip = "The following activities are organized by your preparedness level based on your quiz results.";
			var activity_group_id = activity.preparedness;
		}

		let html = `
			<div class="activity-group" activity-group-id="${activity_group_id}">
				<button data-tooltip class="activity-group__title tooltip">
					<div>
						${headline}
						<div class="tooltip__icon"></div>
						<div class="tooltip__anchor">
							<article data-tooltip-content class="hidden tooltip__content">
								<h1>How this is calculated</h1>
								<p>${tooltip}</p>
							</article>
						</div>
					</div>
				</button>
			</div>`;

		return html;
	},

	initTabs: function () {
		const tabs = document.querySelectorAll("[data-tab]");
		const tabPanels = document.querySelectorAll("[data-tab-panel]");

		tabs.forEach((tab) => {
			tab.addEventListener("click", (e) => {
				e.preventDefault();

				// get the tab id
				const tabId = tab.getAttribute("data-tab");

				this.sort = tabId;

				// remove active class from all tabs
				tabs.forEach((tab) => {
					tab.classList.remove("tab--is-active");
				});

				// add active class to the clicked tab
				tab.classList.add("tab--is-active");

				// hide all tab panels
				tabPanels.forEach((panel) => {
					panel.classList.remove("tab-panel--is-active");
				});

				// show the clicked tab pane
				const selectedPanel = document.querySelector(`[data-tab-panel="${tabId}"]`);
				selectedPanel.classList.add("tab-panel--is-active");
			});
		});
	},

	initFiltersCurated: function () {
		const filters_elements = document.querySelectorAll("[data-filter-curated]");

		filters_elements.forEach((filter_element) => {
			filter_element.addEventListener("change", (e) => {
				var activities = document.querySelectorAll("[data-activity-curated]");
				var selected_filters = [];

				e.preventDefault();

				if (e.target.name == "preparedness" || e.target.name == "priority") {
					activity_group = document.querySelector(`[activity-group-id="${e.target.value}"]`);
					if (e.target.checked) {
						activity_group.classList.remove("hidden");
					} else {
						activity_group.classList.add("hidden");
					}
				}

				filters_elements.forEach((filter) => {
					if (filter.checked) {
						// Add filter to selected filters
						selected_filters.push(filter.value);
					}
				});

				// Add hidden class to everything in activities
				activities.forEach((activity) => {
					activity.classList.remove("hidden");
					// Loop through classes of activity
					var classes = activity.classList;
					var show = true;
					classes.forEach((activity_class) => {
						if (!selected_filters.includes(activity_class)) {
							show = false;
						}
					});
					// If show is false, hide the activity
					if (!show) {
						activity.classList.add("hidden");
					}
				});
			});
		});
	},

	initFiltersAll: function () {
		const filters_elements = document.querySelectorAll("[data-filter-all]");

		filters_elements.forEach((filter_element) => {
			filter_element.addEventListener("change", (e) => {
				var activities = document.querySelectorAll("[data-activity-all]");
				var selected_filters = [];

				e.preventDefault();
				if (e.target.name == "preparedness" || e.target.name == "priority") {
					activity_group = document.querySelector(`[activity-group-id="${e.target.value}"]`);
					if (e.target.checked) {
						activity_group.classList.remove("hidden");
					} else {
						activity_group.classList.add("hidden");
					}
				}

				filters_elements.forEach((filter) => {
					if (filter.checked) {
						// Add filter to selected filters
						selected_filters.push(filter.value);
					}
				});

				// Add hidden class to everything in activities
				activities.forEach((activity) => {
					activity.classList.remove("hidden");
					// Loop through classes of activity
					var classes = activity.classList;
					var show = true;
					classes.forEach((activity_class) => {
						if (!selected_filters.includes(activity_class)) {
							show = false;
						}
					});
					// If show is false, hide the activity
					if (!show) {
						activity.classList.add("hidden");
					}
				});
			});
		});
	},

	buildToken: function () {
		let token = "";

		this.quiz.forEach((item, index) => {
			if (item.weighting) {
				token += index + "-" + item.answer + ".";
			}
		});

		token = token.slice(0, -1);
		token += "";

		searchParams = new URLSearchParams();
		searchParams.set("r", token);
		searchParams.set("gid", GID);
		window.location = "#" + searchParams.toString();
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
