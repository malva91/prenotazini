// js/calendar.js

// Helper per creare elementi con classi
function el(tag, classes = [], text = '') {
  const e = document.createElement(tag);
  classes.forEach(c => e.classList.add(...c.split(' ')));
  if (text) e.textContent = text;
  return e;
}

// Funzione comune per filtrare prenotazioni confermate
function getConfirmedBookings(bookings, dateStr) {
  return bookings.filter(b =>
    b.status === 'confirmed' &&
    b.date === dateStr
  );
}

export function renderMonthlyCalendar(container, bookings, currentDate = new Date()) {
  container.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay(); // 0 = domenica
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const table = el('table', ['w-full', 'border-collapse', 'mb-6']);
  const header = table.insertRow();
  ['Do','Lu','Ma','Me','Gi','Ve','Sa'].forEach(d => {
    header.appendChild(el('th', ['border','p-2','bg-gray-800','text-gray-200'], d));
  });

  let row = table.insertRow();
  for (let i = 0; i < startDay; i++) row.insertCell();

  for (let day = 1; day <= daysInMonth; day++) {
    if (row.cells.length === 7) row = table.insertRow();
    const cell = row.insertCell();
    cell.classList.add('border','h-24','align-top','p-1','bg-gray-900');

    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    cell.appendChild(el('div', ['font-bold','text-gray-100'], String(day)));

    getConfirmedBookings(bookings, dateStr)
      .forEach(b => {
        const bk = el('div', ['text-xs','bg-blue-600','text-white','rounded','my-0.5','px-1','truncate']);
        bk.textContent = `${b.time} • ${b.firstName} ${b.lastName}`;
        cell.appendChild(bk);
      });
  }

  container.appendChild(table);
}

export function renderDailyCalendar(container, bookings, currentDate = new Date()) {
  container.innerHTML = '';
  const dateStr = currentDate.toISOString().slice(0,10);

  const dayBookings = getConfirmedBookings(bookings, dateStr)
    .sort((a,b) => a.time.localeCompare(b.time));

  const list = el('ul', ['space-y-2','mb-6']);
  dayBookings.forEach(b => {
    const li = el('li', ['p-2','bg-gray-900','rounded','flex','justify-between','items-center']);
    li.append(
      el('span', ['font-medium','text-gray-200'], b.time),
      el('span', ['text-gray-300'], `${b.firstName} ${b.lastName}`)
    );
    list.appendChild(li);
  });

  if (dayBookings.length === 0) {
    list.appendChild(el('li', ['text-gray-400','italic'], 'Nessuna prenotazione confermata'));
  }

  container.appendChild(list);
}
