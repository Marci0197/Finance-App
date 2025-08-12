document.addEventListener('DOMContentLoaded', ()=>{
    const h1 = document.getElementById('h1');
    const amountInput = document.getElementById('amount');
    const reasonInput = document.getElementById('reason');
    const addBtn = document.getElementById('addBtn');
    const entries = document.getElementById('entries');
    const errorMsg = document.getElementById('errorMsg');
    const STORAGE_KEY = 'financeAppData_v1';

    function formatEuro(num){
        return num.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    }

    function escapeHtml(str){
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    let data = { balance: 0, entries: [] };
    function loadData(){
        try{
            const raw = localStorage.getItem(STORAGE_KEY);
            if(raw){
                const parsed = JSON.parse(raw);

                if(typeof parsed.balance === 'number' && Array.isArray(parsed.entries)){
                    data = parsed;
                }
            }
        }catch(e){ console.warn('Fehler beim Laden der Daten', e); }
    }

    function saveData(){
        try{
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }catch(e){ console.warn('Fehler beim Speichern der Daten', e); }
    }

    function renderHeader(){
        h1.textContent = formatEuro(data.balance);
        h1.style.color = data.balance < 0 ? '#c00' : '#060';
    }

    function renderEntries(){
        entries.innerHTML = '';
        data.entries.slice().reverse().forEach((entry, index) => {
            const li = document.createElement('li');
            const amountClass = entry.value >= 0 ? 'amount positive' : 'amount negative';
            const sign = entry.value >= 0 ? '+' : '';
            const amountSpan = `<span class="${amountClass}">${sign}${entry.value.toFixed(2)} €</span>`;
            const reasonSpan = `<span class="reason">${escapeHtml(entry.reason)}</span>`;
            const timeSpan = `<span class="time">${new Date(entry.date).toLocaleString('de-DE')}</span>`;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Löschen';
            deleteBtn.className = 'deleteBtn';
            deleteBtn.addEventListener('click', () => {
                const originalIndex = data.entries.length - 1 - index;
                const removed = data.entries.splice(originalIndex, 1)[0];
                data.balance -= removed.value;
                saveData();
                renderHeader();
                renderEntries();
            });

            li.innerHTML = amountSpan + reasonSpan + timeSpan;
            li.appendChild(deleteBtn);
            entries.appendChild(li);
        });
    }

    function showError(message){
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        setTimeout(()=> errorMsg.style.display = 'none', 3000);
    }

    loadData();
    renderHeader();
    renderEntries();
    addBtn.addEventListener('click', addEntry);
    amountInput.addEventListener('keydown', e=>{ if(e.key === 'Enter') addEntry(); });
    reasonInput.addEventListener('keydown', e=>{ if(e.key === 'Enter') addEntry(); });

    function addEntry(){
        const raw = amountInput.value.trim();
        if(raw === ''){
            showError('Bitte gib einen Betrag ein!');
            amountInput.focus();
            return;
        }

        const value = parseFloat(raw.replace(',', '.'));
        if(isNaN(value)){
            showError('Bitte gib eine gültige Zahl ein!');
            amountInput.focus();
            return;
        }

        const reason = reasonInput.value.trim();
        if(!reason){
            showError('Bitte gib einen Kommentar ein!');
            reasonInput.focus();
            return;
        }

        const entry = { value: value, reason: reason, date: new Date().toISOString() };
        data.entries.push(entry);
        data.balance += value;
        saveData();
        renderHeader();
        renderEntries();
        amountInput.value = '';
        reasonInput.value = '';
        amountInput.focus();
    }
});