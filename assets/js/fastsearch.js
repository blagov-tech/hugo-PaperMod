import * as params from '@params';

let fuse; // holds our search engine
let resList = document.getElementById('searchResults');
let sInput = document.getElementById('searchInput');
let first, last, current_elem = null
let resultsAvailable = false;

// load our search index
window.onload = function () {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                let data = JSON.parse(xhr.responseText);
                if (data) {
                    // fuse.js options; check fuse.js website for details
                    let options = {
                        distance: 100,
                        threshold: 0.4,
                        ignoreLocation: true,
                        keys: [
                            'title',
                            'permalink',
                            'summary',
                            'content'
                        ]
                    };
                    if (params.fuseOpts) {
                        options = {
                            isCaseSensitive: params.fuseOpts.iscasesensitive ?? false,
                            includeScore: params.fuseOpts.includescore ?? false,
                            includeMatches: params.fuseOpts.includematches ?? false,
                            minMatchCharLength: params.fuseOpts.minmatchcharlength ?? 1,
                            shouldSort: params.fuseOpts.shouldsort ?? true,
                            findAllMatches: params.fuseOpts.findallmatches ?? false,
                            keys: params.fuseOpts.keys ?? ['title', 'permalink', 'summary', 'content'],
                            location: params.fuseOpts.location ?? 0,
                            threshold: params.fuseOpts.threshold ?? 0.4,
                            distance: params.fuseOpts.distance ?? 100,
                            ignoreLocation: params.fuseOpts.ignorelocation ?? true
                        }
                    }
                    if (options.keys.includes('rev_title')) {
                        // Build mapping for en <-> ru layouts
                        const en = '`qwertyuiop[]asdfghjkl;\'zxcvbnm,./~QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?';
                        const ru = 'ёйцукенгшщзхъфывапролджэячсмитьбю./ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,?';

                        // Create maps in both directions
                        const toRu = {};
                        const toEn = {};
                        for (let i = 0; i < en.length; i++) {
                            toRu[en[i]] = ru[i];
                        }
                        for (let i = 0; i < ru.length; i++) {
                            toEn[ru[i]] = en[i];
                        }

                        // Function to convert a string to the "opposite" keyboard layout
                        function convertLayout(str) {
                            let res = '';
                            for (const ch of str) {
                                if (toRu.hasOwnProperty(ch)) {
                                    res += toRu[ch];
                                } else if (toEn.hasOwnProperty(ch)) {
                                    res += toEn[ch];
                                } else {
                                    res += ch;
                                }
                            }
                            return res;
                        }

                        // Add rev_title to each item in data
                        if (Array.isArray(data)) {
                            for (let i = 0; i < data.length; i++) {
                                if (typeof data[i].title === 'string') {
                                    data[i].rev_title = convertLayout(data[i].title);
                                }
                            }
                        }
                    }
                    fuse = new Fuse(data, options); // build the index from the json file
                }
            } else {
                console.log(xhr.responseText);
            }
        }
    };
    xhr.open('GET', "../index.json");
    xhr.send();
}

function activeToggle(ae) {
    document.querySelectorAll('.focus').forEach(function (element) {
        // rm focus class
        element.classList.remove("focus")
    });
    if (ae) {
        ae.focus()
        document.activeElement = current_elem = ae;
        ae.parentElement.classList.add("focus")
    } else {
        document.activeElement.parentElement.classList.add("focus")
    }
}

function reset() {
    resultsAvailable = false;
    resList.innerHTML = sInput.value = ''; // clear inputbox and searchResults
    sInput.focus(); // shift focus to input box
}

// execute search as each character is typed
sInput.onkeyup = function (e) {
    // run a search query (for "term") every time a letter is typed
    // in the search box
    if (fuse) {
        let results;
        if (params.fuseOpts) {
            results = fuse.search(this.value.trim(), {limit: params.fuseOpts.limit}); // the actual query being run using fuse.js along with options
        } else {
            results = fuse.search(this.value.trim()); // the actual query being run using fuse.js
        }
        if (results.length !== 0) {
            // build our html if result exists
            let resultSet = ''; // our results bucket
            let lim = params.fuseOpts.searchResultsLimit ?? 100;

            for (let item in results.slice(0, lim)) {
                let isPage = results[item].item.is_page;
                let link = isPage ? results[item].item.link : results[item].item.permalink;
                resultSet += `<li class="card-post-entry"><h3 class="card-header card-hint-parent">${results[item].item.title}` 
                if (isPage) {
                    let openInNew = `<svg fill="currentColor" viewBox="0 -960 960 960"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>`
                    resultSet += `<span class="card-hint-icons"><span class="card-hint" title="Open link in new tab">${openInNew}</span></span>`
                    resultSet += `</header>`
                    resultSet += `<a href="${link}" aria-label="${results[item].item.title}" target="_blank"></a>`
                } else {
                    resultSet += `</header>`
                    resultSet += `<a href="${link}" aria-label="${results[item].item.title}"></a>`
                }
                resultSet += `</li>`
            }
            if (results.length > lim) {
                resultSet += `<li class="card-post-entry"><h3 class="card-header card-hint-parent">${results.length - lim} more results...</h3></li>`
            }

            resList.innerHTML = resultSet;
            resultsAvailable = true;
            first = resList.firstChild;
            last = resList.lastChild;
        } else {
            resultsAvailable = false;
            resList.innerHTML = '';
        }
    }
}

sInput.addEventListener('search', function (e) {
    // clicked on x
    if (!this.value) reset()
})

// kb bindings
document.onkeydown = function (e) {
    let key = e.key;
    let ae = document.activeElement;

    let inbox = document.getElementById("searchbox").contains(ae)

    if (ae === sInput) {
        let elements = document.getElementsByClassName('focus');
        while (elements.length > 0) {
            elements[0].classList.remove('focus');
        }
    } else if (current_elem) ae = current_elem;

    if (key === "Escape") {
        reset()
    } else if (!resultsAvailable || !inbox) {
        return
    } else if (key === "ArrowDown") {
        e.preventDefault();
        if (ae == sInput) {
            // if the currently focused element is the search input, focus the <a> of first <li>
            activeToggle(resList.firstChild.lastChild);
        } else if (ae.parentElement != last) {
            // if the currently focused element's parent is last, do nothing
            // otherwise select the next search result
            activeToggle(ae.parentElement.nextSibling.lastChild);
        }
    } else if (key === "ArrowUp") {
        e.preventDefault();
        if (ae.parentElement == first) {
            // if the currently focused element is first item, go to input box
            activeToggle(sInput);
        } else if (ae != sInput) {
            // if the currently focused element is input box, do nothing
            // otherwise select the previous search result
            activeToggle(ae.parentElement.previousSibling.lastChild);
        }
    } else if (key === "ArrowRight") {
        ae.click(); // click on active link
    }
}
