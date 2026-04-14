  const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
        const API_KEYS_URL = "GROQ_API_KEY";
        const RSS_FEED = "https://feeds.bbci.co.uk/news/world/rss.xml";
        const PROXY_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED)}`;

        let apiKeys = [];
        let selectedInterests = [];
        let allFetchedArticles = [];
        let currentDisplayCount = 0;
        const interestList = ["Technology", "Politics", "Sports", "Art", "Finance", "Health", "Science", "Entertainment"];

        async function init() {
            lucide.createIcons();
            renderInterests();
            await initApiKeys();
        }

        function renderInterests() {
            const grid = document.getElementById('interests-grid');
            interestList.forEach(item => {
                const btn = document.createElement('button');
                btn.className = "interest-chip border border-gray-200 dark:border-gray-800 py-4 rounded-2xl font-semibold transition active:scale-95";
                btn.innerText = item;
                btn.onclick = () => {
                    btn.classList.toggle('selected');
                    if(selectedInterests.includes(item)) selectedInterests = selectedInterests.filter(i => i !== item);
                    else selectedInterests.push(item);
                };
                grid.appendChild(btn);
            });
        }

        document.getElementById('done-btn').onclick = async () => {
            if(!selectedInterests.length) return alert("Select your interests first!");
            document.getElementById('stage-interests').classList.add('hidden');
            document.getElementById('stage-loading').classList.remove('hidden');
            await fetchAndCurateNews();
        };

        async function fetchAndCurateNews() {
            try {
                const res = await fetch(PROXY_URL);
                const data = await res.json();
                allFetchedArticles = data.items;

                const prompt = `User interests: ${selectedInterests.join(", ")}. 
                Articles: ${allFetchedArticles.map((a, i) => `ID ${i}: ${a.title}`).join(" | ")}.
                Pick 5 relevant IDs. Return ONLY JSON: {"picks": [indices], "explanation": "Short summary"}`;

                const aiResponse = await callGroq([{ role: "user", content: prompt }]);
                const curation = JSON.parse(aiResponse.match(/\{.*\}/s)[0]);

                document.getElementById('stage-loading').classList.add('hidden');
                document.getElementById('stage-feed').classList.remove('hidden');
                document.getElementById('ai-reasoning').innerText = curation.explanation;

                // Load initial 2 picks
                renderMoreArticles(curation.picks.slice(0, 2));
                currentDisplayCount = 2;

                // Load More Button
                document.getElementById('load-more-btn').onclick = () => {
                    const nextPicks = curation.picks.slice(currentDisplayCount, currentDisplayCount + 2);
                    if(nextPicks.length) {
                        renderMoreArticles(nextPicks);
                        currentDisplayCount += 2;
                    } else {
                        document.getElementById('load-more-btn').innerText = "No more curated stories";
                    }
                };
            } catch (err) {
                console.error(err);
                alert("AI could not curate. Please refresh.");
            }
        }

        function renderMoreArticles(indices) {
            const container = document.getElementById('articles-container');
            indices.forEach(idx => {
                const art = allFetchedArticles[idx];
                const card = document.createElement('div');
                card.className = "bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl flex gap-4 items-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition cursor-pointer";
                card.onclick = () => window.open(art.link, '_blank');
                card.innerHTML = `
                    <div class="flex-1">
                        <h3 class="font-bold text-sm leading-tight mb-1">${art.title}</h3>
                        <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">Latest News</p>
                    </div>
                    <div class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                        <img src="${art.thumbnail || 'https://via.placeholder.com/100'}" class="w-full h-full object-cover">
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // --- EXPANDABLE ASK BAR LOGIC ---
        const askContainer = document.getElementById('ai-ask-container');
        const askInput = document.getElementById('ai-ask-input');
        const askTrigger = document.getElementById('ai-ask-trigger');
        const sendBtn = document.getElementById('ai-send-btn');
        const chatResponse = document.getElementById('inline-chat-response');

        askTrigger.onclick = () => {
            askContainer.classList.toggle('expanded');
            const isExpanded = askContainer.classList.contains('expanded');
            askInput.classList.toggle('hidden', !isExpanded);
            sendBtn.classList.toggle('hidden', !isExpanded);
            if(isExpanded) askInput.focus();
        };

        sendBtn.onclick = async () => {
            const query = askInput.value.trim();
            if(!query) return;
            
            chatResponse.classList.remove('hidden');
            chatResponse.innerText = "Thinking...";
            
            const reply = await callGroq([{ role: "user", content: `User asks about curated news: ${query}` }]);
            chatResponse.innerText = reply;
            askInput.value = '';
        };

        // --- GROQ API HELPERS ---
        async function initApiKeys() {
            try {
                const res = await fetch(API_KEYS_URL);
                const txt = await res.text();
                apiKeys = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l);
            } catch (e) { console.error("Could not load API keys"); }
        }

        async function callGroq(messages) {
            const key = apiKeys[Math.floor(Math.random() * apiKeys.length)];
            const res = await fetch(GROQ_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature: 0.3 })
            });
            const data = await res.json();
            return data.choices[0].message.content;
        }

        init();
