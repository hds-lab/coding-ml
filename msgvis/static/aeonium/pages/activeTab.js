/**
 * Created by zenanwang on 11/3/16.
 */

(function() {
    'use strict';

    window.onload = function() {
        document.getElementById("codingB").onclick = codingActive;
        document.getElementById("reviewB").onclick = reviewActive;
    };

    function codingActive() {
        activeTab("codingB", "reviewB");
    }

    function reviewActive() {
        activeTab("reviewB", "codingB");
    }

    function activeTab(active, inactive) {
        document.getElementById(active).classList.add("selectedButton");
        document.getElementById(inactive).className = document.getElementById(inactive).className.replace(/(?:^|\s)selectedButton(?!\S)/g, '')
    }

})();