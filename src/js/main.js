// Anda perlu mengganti URL ini dengan URL Google Apps Script yang telah Anda publikasikan
const SPREADSHEET_URL = 'https://script.google.com/macros/s/AKfycbwOsPphtGQTK-cHiw_MBKNr3HJzysUax2vk2lHexWzwpSe4p2TGt2-uspNVNcUFomeadg/exec';

// Data storage (akan diisi dari Google Sheets)
let transaksi = [];
let hutangList = [];

// Tab functionality
function showTab(tabName) {
    const allTabs = document.querySelectorAll('.tab-content');
    const tabKeuanganBtn = document.getElementById('tab-keuangan');
    const tabHutangBtn = document.getElementById('tab-hutang');
    const targetTab = document.getElementById(`content-${tabName}`);

    // Hide all tabs instantly
    allTabs.forEach(tab => {
        tab.classList.add('hidden');
        tab.style.animation = '';
    });

    // Reset all buttons to default state
    tabKeuanganBtn.classList.remove('bg-blue-500', 'text-white', 'hover:bg-blue-600');
    tabKeuanganBtn.classList.add('text-gray-600', 'hover:bg-gray-100', 'border', 'border-gray-300');
    tabHutangBtn.classList.remove('bg-purple-500', 'text-white', 'hover:bg-purple-600');
    tabHutangBtn.classList.add('text-gray-600', 'hover:bg-purple-100', 'border', 'border-purple-300', 'hover:border-purple-400');

    // Show the target tab instantly
    targetTab.classList.remove('hidden');

    // Set active button
    if (tabName === 'keuangan') {
        tabKeuanganBtn.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600');
        tabKeuanganBtn.classList.remove('text-gray-600', 'hover:bg-gray-100', 'border', 'border-gray-300');
    } else if (tabName === 'hutang') {
        tabHutangBtn.classList.add('bg-purple-500', 'text-white', 'hover:bg-purple-600');
        tabHutangBtn.classList.remove('text-gray-600', 'hover:bg-purple-100', 'border', 'border-purple-300', 'hover:border-purple-400');
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date to Indonesian format
function formatDateIndonesian(dateString) {
    if (!dateString) return '';

    // Check if the dateString is a valid date object or string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // If it's not a valid date object, assume it's already in the desired string format
        return dateString;
    }

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-semibold text-sm transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Show modal
function showModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// Hide modal
function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Close modal when clicking overlay
document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) {
        hideModal();
    }
});

// Update summary
function updateSummary() {
    const totalPemasukan = transaksi
        .filter(t => t.type === 'pemasukan')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalPengeluaran = transaksi
        .filter(t => t.type === 'pengeluaran')
        .reduce((sum, t) => sum + t.amount, 0);

    const saldo = totalPemasukan - totalPengeluaran;

    document.getElementById('total-pemasukan').textContent = formatCurrency(totalPemasukan);
    document.getElementById('total-pengeluaran').textContent = formatCurrency(totalPengeluaran);
    document.getElementById('saldo-terkini').textContent = formatCurrency(saldo);
}

// Update summary hutang
function updateSummaryHutang() {
    const totalPeminjam = hutangList.length;
    const totalHutangBelumLunas = hutangList.filter(h => h.status === 'belum_lunas').length;

    const totalUangDiutangin = hutangList.reduce((sum, h) => {
        if (h.status === 'belum_lunas') {
            return sum + (h.jumlah - h.cicilan);
        }
        return sum;
    }, 0);

    document.getElementById('total-peminjam').textContent = totalPeminjam;
    document.getElementById('total-hutang-belum-lunas').textContent = totalHutangBelumLunas;
    document.getElementById('total-uang-diutangin').textContent = formatCurrency(totalUangDiutangin);
}

// Display transactions
function displayTransactions(filter = 'semua') {
    const container = document.getElementById('riwayat-transaksi');

    let filteredTransaksi = transaksi;
    if (filter !== 'semua') {
        filteredTransaksi = transaksi.filter(t => t.type === filter);
    }

    if (filteredTransaksi.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 md:py-12">
                <div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                    <span class="text-xl md:text-3xl">📝</span>
                </div>
                <h3 class="text-base md:text-lg font-bold text-gray-600 mb-1 md:mb-2">Belum Ada Transaksi</h3>
                <p class="text-gray-500 text-xs md:text-sm">Mulai tambahkan pemasukan atau pengeluaran Anda untuk melihat riwayat di sini</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTransaksi.map(t => `
        <div class="glass-card border-2 border-gray-100 rounded-lg p-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 ${t.type === 'pemasukan' ? 'gradient-income' : 'gradient-expense'} opacity-10 rounded-full -mr-8 -mt-8"></div>
            
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 md:hidden">
                <div class="flex items-start flex-1 mb-2">
                    <div class="w-12 h-12 ${t.type === 'pemasukan' ? 'gradient-income' : 'gradient-expense'} rounded-lg flex items-center justify-center mr-3 shadow-lg">
                        <span class="text-base">${t.type === 'pemasukan' ? '💰' : '💸'}</span>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-base text-gray-800 capitalize">
                            ${t.description}
                        </h3>
                        <p class="font-semibold text-sm ${t.type === 'pemasukan' ? 'text-green-600' : 'text-red-600'}">
                            ${t.type === 'pemasukan' ? '+' : '-'} ${formatCurrency(t.amount)}
                        </p>
                        <p class="text-gray-500 text-xs font-medium flex items-center mt-1">
                            <span class="mr-1">📅</span> ${formatDateIndonesian(t.date)}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2 w-full">
                    <button onclick="editTransaction('${t.id}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                        Edit
                    </button>
                    <button onclick="deleteTransaction('${t.id}')" class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                        Hapus
                    </button>
                </div>
            </div>

            <div class="hidden md:flex justify-between items-start relative z-10">
                <div class="flex items-start flex-1">
                    <div class="w-14 h-14 ${t.type === 'pemasukan' ? 'gradient-income' : 'gradient-expense'} rounded-lg flex items-center justify-center mr-4 shadow-lg">
                        <span class="text-lg">${t.type === 'pemasukan' ? '💰' : '💸'}</span>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-lg text-gray-800 mb-2 capitalize">
                            ${t.description}
                        </h3>
                        <p class="text-gray-500 text-sm font-medium flex items-center">
                            <span class="mr-1">📅</span> ${formatDateIndonesian(t.date)}
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-base ${t.type === 'pemasukan' ? 'text-green-600' : 'text-red-600'} mb-2">
                        ${t.type === 'pemasukan' ? '+' : '-'} ${formatCurrency(t.amount)}
                    </p>
                    <div class="flex gap-1">
                        <button onclick="editTransaction('${t.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                            Edit
                        </button>
                        <button onclick="deleteTransaction('${t.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter transactions
function filterTransactions() {
    const filter = document.getElementById('filter-transaksi').value;
    displayTransactions(filter);
}

// Add transaction
async function addTransaction(type, description, amount) {
    const transaction = {
        id: Date.now(),
        date: new Date().toISOString(), // Simpan dalam format ISO untuk konsistensi
        type,
        description,
        amount: parseInt(amount)
    };

    transaksi.unshift(transaction);
    await saveData('Keuangan');

    updateSummary();
    displayTransactions();

    const typeText = type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    showNotification(`${typeText} berhasil ditambahkan! Saldo telah terupdate.`, 'success');
}

// Display hutang
function displayHutang(filter = 'semua') {
    const container = document.getElementById('daftar-hutang');

    let filteredHutang = hutangList;
    if (filter !== 'semua') {
        filteredHutang = hutangList.filter(h => h.status === filter);
    }

    if (filteredHutang.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 md:py-12">
                <div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                    <span class="text-xl md:text-3xl">📝</span>
                </div>
                <h3 class="text-base md:text-lg font-bold text-gray-600 mb-1 md:mb-2">Belum Ada Data Hutang</h3>
                <p class="text-gray-500 text-xs md:text-sm">Tambahkan data hutang untuk mulai mengelola piutang Anda dengan lebih baik</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredHutang.map(h => {
        const sisaHutang = h.jumlah - h.cicilan;

        return `
            <div class="glass-card border-2 ${h.status === 'lunas' ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-white' : 'border-gray-100'} rounded-lg p-4 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-16 h-16 ${h.status === 'lunas' ? 'gradient-income' : 'gradient-debt'} opacity-10 rounded-full -mr-8 -mt-8"></div>
                
                <div class="flex items-start justify-between mb-2 relative z-10">
                    <div class="flex items-start flex-1">
                        <div class="w-12 h-12 ${h.status === 'lunas' ? 'gradient-income' : 'gradient-debt'} rounded-lg flex items-center justify-center mr-3 shadow-lg">
                            <span class="text-base">${h.status === 'lunas' ? '✅' : '💳'}</span>
                        </div>
                        <div class="flex-1">
                            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 class="font-bold text-lg text-gray-800">${h.nama}</h3>
                                ${h.status === 'lunas' ?
                '<span class="inline-block bg-gradient-to-r from-green-100 to-green-200 text-green-600 text-xs px-2 py-0.5 rounded-full font-semibold">LUNAS</span>' :
                '<span class="inline-block bg-gradient-to-r from-red-100 to-red-200 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">BELUM LUNAS</span>'
            }
                            </div>
                            <p class="text-gray-500 text-xs font-medium flex items-center mb-2">
                                <span class="mr-1">📅</span> ${formatDateIndonesian(h.tanggal)}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-2 bg-gray-50 rounded-lg p-3">
                    <div class="pr-2 border-r-2 border-gray-300">
                        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Hutang Awal</p>
                        <p class="text-base font-bold text-purple-600">${formatCurrency(h.jumlah)}</p>
                    </div>
                    <div class="pl-2">
                        ${h.status === 'lunas' ? `
                            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Sudah Dibayar</p>
                            <p class="text-base font-bold text-green-600">${formatCurrency(h.jumlah)}</p>
                        ` : `
                            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Sisa Hutang</p>
                            <p class="text-base font-bold text-red-600">${formatCurrency(sisaHutang)}</p>
                        `}
                    </div>
                </div>
                
                ${h.keterangan ? `
                    <div class="bg-white/80 rounded-lg p-2 mb-2 border-l-4 border-blue-400">
                        <p class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Keterangan</p>
                        <p class="text-gray-700 text-sm capitalize">${h.keterangan}</p>
                    </div>
                ` : ''}
                
                <div class="flex flex-wrap gap-2 mt-4 w-full">
                    <div class="flex gap-2 w-full">
                        <button onclick="editHutang('${h.id}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteHutang('${h.id}')" class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                            🗑️ Hapus
                        </button>
                    </div>

                    ${h.status !== 'lunas' ? `
                        <div class="flex gap-2 w-full mt-2">
                            <button onclick="bayarCicilan('${h.id}')" 
                                    class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                <span class="mr-1">💰</span> Bayar
                            </button>
                            <button onclick="lunaskanHutang('${h.id}')" 
                                    class="flex-1 gradient-income text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                <span class="mr-1">✅</span> Lunas
                            </button>
                        </div>
                    ` : ''}

                    ${h.status !== 'lunas' && (h.whatsapp || h.email) ? `
                        <div class="flex gap-2 w-full mt-2">
                            ${h.whatsapp ? `
                                <button onclick="kirimPesan('${h.whatsapp}', '${h.nama}', ${sisaHutang})" 
                                        class="flex-1 gradient-income text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                    <span class="mr-1">📱</span> Ingatkan WA
                                </button>
                            ` : ''}
                            ${h.email ? `
                                <button onclick="kirimEmail('${h.email}', '${h.nama}', ${sisaHutang})" 
                                        class="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                    <span class="mr-1">📧</span> Ingatkan Email
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}


// Filter transactions
function filterTransactions() {
    const filter = document.getElementById('filter-transaksi').value;
    displayTransactions(filter);
}

// Add transaction
async function addTransaction(type, description, amount) {
    const transaction = {
        id: Date.now(),
        date: new Date().toISOString(), // Simpan dalam format ISO untuk konsistensi
        type,
        description,
        amount: parseInt(amount)
    };

    transaksi.unshift(transaction);
    await saveData('Keuangan');

    updateSummary();
    displayTransactions();

    const typeText = type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    showNotification(`${typeText} berhasil ditambahkan! Saldo telah terupdate.`, 'success');
}

// Display hutang
function displayHutang(filter = 'semua') {
    const container = document.getElementById('daftar-hutang');

    let filteredHutang = hutangList;
    if (filter !== 'semua') {
        filteredHutang = hutangList.filter(h => h.status === filter);
    }

    if (filteredHutang.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 md:py-12">
                <div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                    <span class="text-xl md:text-3xl">📝</span>
                </div>
                <h3 class="text-base md:text-lg font-bold text-gray-600 mb-1 md:mb-2">Belum Ada Data Hutang</h3>
                <p class="text-gray-500 text-xs md:text-sm">Tambahkan data hutang untuk mulai mengelola piutang Anda dengan lebih baik</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredHutang.map(h => {
        const sisaHutang = h.jumlah - h.cicilan;

        return `
            <div class="glass-card border-2 ${h.status === 'lunas' ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-white' : 'border-gray-100'} rounded-lg p-4 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-16 h-16 ${h.status === 'lunas' ? 'gradient-income' : 'gradient-debt'} opacity-10 rounded-full -mr-8 -mt-8"></div>
                
                <div class="flex items-start justify-between mb-2 relative z-10">
                    <div class="flex items-start flex-1">
                        <div class="w-12 h-12 ${h.status === 'lunas' ? 'gradient-income' : 'gradient-debt'} rounded-lg flex items-center justify-center mr-3 shadow-lg">
                            <span class="text-base">${h.status === 'lunas' ? '✅' : '💳'}</span>
                        </div>
                        <div class="flex-1">
                            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 class="font-bold text-lg text-gray-800">${h.nama}</h3>
                                ${h.status === 'lunas' ?
                '<span class="inline-block bg-gradient-to-r from-green-100 to-green-200 text-green-600 text-xs px-2 py-0.5 rounded-full font-semibold">LUNAS</span>' :
                '<span class="inline-block bg-gradient-to-r from-red-100 to-red-200 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">BELUM LUNAS</span>'
            }
                            </div>
                            <p class="text-gray-500 text-xs font-medium flex items-center mb-2">
                                <span class="mr-1">📅</span> ${formatDateIndonesian(h.tanggal)}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-2 bg-gray-50 rounded-lg p-3">
                    <div class="pr-2 border-r-2 border-gray-300">
                        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Hutang Awal</p>
                        <p class="text-base font-bold text-purple-600">${formatCurrency(h.jumlah)}</p>
                    </div>
                    <div class="pl-2">
                        ${h.status === 'lunas' ? `
                            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Sudah Dibayar</p>
                            <p class="text-base font-bold text-green-600">${formatCurrency(h.jumlah)}</p>
                        ` : `
                            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Sisa Hutang</p>
                            <p class="text-base font-bold text-red-600">${formatCurrency(sisaHutang)}</p>
                        `}
                    </div>
                </div>
                
                ${h.keterangan ? `
                    <div class="bg-white/80 rounded-lg p-2 mb-2 border-l-4 border-blue-400">
                        <p class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Keterangan</p>
                        <p class="text-gray-700 text-sm capitalize">${h.keterangan}</p>
                    </div>
                ` : ''}
                
                <div class="flex flex-wrap gap-2 mt-4 w-full">
                    <div class="flex gap-2 w-full">
                        <button onclick="editHutang('${h.id}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteHutang('${h.id}')" class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition-all duration-300">
                            🗑️ Hapus
                        </button>
                    </div>

                    ${h.status !== 'lunas' ? `
                        <div class="flex gap-2 w-full mt-2">
                            <button onclick="bayarCicilan('${h.id}')" 
                                    class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                <span class="mr-1">💰</span> Bayar
                            </button>
                            <button onclick="lunaskanHutang('${h.id}')" 
                                    class="flex-1 gradient-income text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                <span class="mr-1">✅</span> Lunas
                            </button>
                        </div>
                    ` : ''}

                    ${h.status !== 'lunas' && (h.whatsapp || h.email) ? `
                        <div class="flex gap-2 w-full mt-2">
                            ${h.whatsapp ? `
                                <button onclick="kirimPesan('${h.whatsapp}', '${h.nama}', ${sisaHutang})" 
                                        class="flex-1 gradient-income text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                    <span class="mr-1">📱</span> Ingatkan WA
                                </button>
                            ` : ''}
                            ${h.email ? `
                                <button onclick="kirimEmail('${h.email}', '${h.nama}', ${sisaHutang})" 
                                        class="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:scale-105 transition-all duration-300 shadow-lg modern-button flex items-center justify-center">
                                    <span class="mr-1">📧</span> Ingatkan Email
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}


// Filter hutang
function filterHutang() {
    const filter = document.getElementById('filter-hutang').value;
    displayHutang(filter);
}

// Add hutang
async function addHutang(nama, jumlah, keterangan, whatsapp, email) {
    const hutang = {
        id: Date.now(),
        nama,
        jumlah: parseInt(jumlah),
        keterangan,
        whatsapp,
        email,
        tanggal: new Date().toISOString(), // Simpan dalam format ISO untuk konsistensi
        cicilan: 0,
        sisaHutang: parseInt(jumlah),
        status: 'belum_lunas'
    };

    hutangList.unshift(hutang);
    await saveData('Hutang');

    displayHutang();
    updateSummaryHutang();

    showNotification('Hutang berhasil ditambahkan!', 'success');
}

// Edit transaction
function editTransaction(id) {
    const transaction = transaksi.find(t => t.id == id);
    if (!transaction) return;

    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-12 h-12 ${transaction.type === 'pemasukan' ? 'gradient-income' : 'gradient-expense'} rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span class="text-lg">${transaction.type === 'pemasukan' ? '💰' : '💸'}</span>
            </div>
            <h2 class="text-xl font-bold ${transaction.type === 'pemasukan' ? 'text-green-600' : 'text-red-600'} mb-2">Edit ${transaction.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</h2>
            <p class="text-gray-600 text-sm">Ubah detail transaksi Anda</p>
        </div>
        
        <form id="edit-transaction-form" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    📝 Keterangan
                </label>
                <input type="text" id="edit-description" class="w-full px-4 py-3 rounded-lg modern-input text-sm" value="${transaction.description}" required>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    💵 Jumlah
                </label>
                <input type="number" id="edit-amount" class="w-full px-4 py-3 rounded-lg modern-input text-sm font-medium" value="${transaction.amount}" required>
            </div>
            
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="hideModal()" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 transition-all duration-300">
                    Batal
                </button>
                <button type="submit" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm ${transaction.type === 'pemasukan' ? 'gradient-income' : 'gradient-expense'} text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button">
                    Simpan
                </button>
            </div>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('edit-transaction-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const newDescription = document.getElementById('edit-description').value.trim();
        const newAmount = document.getElementById('edit-amount').value;

        if (newDescription && newAmount && !isNaN(newAmount)) {
            transaksi = transaksi.map(t =>
                t.id == id ? { ...t, description: newDescription, amount: parseInt(newAmount) } : t
            );
            await saveData('Keuangan');
            updateSummary();
            displayTransactions();
            hideModal();
            showNotification('Transaksi berhasil diupdate!', 'success');
        }
    });
}

// Delete transaction
function deleteTransaction(id) {
    const transaction = transaksi.find(t => t.id == id);
    if (!transaction) return;

    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span class="text-lg text-white">🗑️</span>
            </div>
            <h2 class="text-xl font-bold text-red-600 mb-2">Hapus Transaksi</h2>
            <p class="text-gray-600 text-sm mb-4">Apakah Anda yakin ingin menghapus transaksi ini?</p>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <p class="font-semibold text-gray-800">${transaction.description}</p>
                <p class="text-lg font-bold ${transaction.type === 'pemasukan' ? 'text-green-600' : 'text-red-600'}">
                    ${transaction.type === 'pemasukan' ? '+' : '-'} ${formatCurrency(transaction.amount)}
                </p>
                <p class="text-sm text-gray-500">${formatDateIndonesian(transaction.date)}</p>
            </div>
        </div>
        
        <div class="flex gap-3">
            <button type="button" onclick="hideModal()" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 transition-all duration-300">
                Batal
            </button>
            <button type="button" onclick="confirmDeleteTransaction('${id}')" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-all duration-300">
                Hapus
            </button>
        </div>
    `;

    showModal(modalContent);
}

// Confirm delete transaction
async function confirmDeleteTransaction(id) {
    transaksi = transaksi.filter(t => t.id != id);
    await saveData('Keuangan');
    updateSummary();
    displayTransactions();
    hideModal();
    showNotification('Transaksi berhasil dihapus!', 'success');
}

// Edit hutang
function editHutang(id) {
    const hutang = hutangList.find(h => h.id == id);
    if (!hutang) return;

    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-12 h-12 gradient-debt rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span class="text-lg">💳</span>
            </div>
            <h2 class="text-xl font-bold text-purple-600 mb-2">Edit Hutang</h2>
            <p class="text-gray-600 text-sm">Ubah detail hutang</p>
        </div>
        
        <form id="edit-hutang-form" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    👤 Nama Penghutang
                </label>
                <input type="text" id="edit-nama" class="w-full px-4 py-3 rounded-lg modern-input text-sm font-medium" value="${hutang.nama}" required>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    💰 Jumlah Hutang
                </label>
                <input type="number" id="edit-jumlah" class="w-full px-4 py-3 rounded-lg modern-input text-sm font-medium" value="${hutang.jumlah}" required>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    📝 Keterangan
                </label>
                <textarea id="edit-keterangan" class="w-full px-4 py-3 rounded-lg modern-input text-sm" rows="3">${hutang.keterangan || ''}</textarea>
            </div>
            
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="hideModal()" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 transition-all duration-300">
                    Batal
                </button>
                <button type="submit" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm gradient-debt text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button">
                    Simpan
                </button>
            </div>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('edit-hutang-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const newNama = document.getElementById('edit-nama').value.trim();
        const newJumlah = document.getElementById('edit-jumlah').value;
        const newKeterangan = document.getElementById('edit-keterangan').value.trim();

        if (newNama && newJumlah && !isNaN(newJumlah)) {
            hutangList = hutangList.map(h =>
                h.id == id ? { ...h, nama: newNama, jumlah: parseInt(newJumlah), keterangan: newKeterangan } : h
            );
            await saveData('Hutang');
            displayHutang();
            updateSummaryHutang();
            hideModal();
            showNotification('Hutang berhasil diupdate!', 'success');
        }
    });
}

// Delete hutang
function deleteHutang(id) {
    const hutang = hutangList.find(h => h.id == id);
    if (!hutang) return;

    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span class="text-lg text-white">🗑️</span>
            </div>
            <h2 class="text-xl font-bold text-red-600 mb-2">Hapus Data Hutang</h2>
            <p class="text-gray-600 text-sm mb-4">Apakah Anda yakin ingin menghapus data hutang ini?</p>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <p class="font-semibold text-gray-800">${hutang.nama}</p>
                <p class="text-lg font-bold text-purple-600">${formatCurrency(hutang.jumlah)}</p>
                ${hutang.keterangan ? `<p class="text-sm text-gray-500">${hutang.keterangan}</p>` : ''}
                <p class="text-sm text-gray-500">${formatDateIndonesian(hutang.tanggal)}</p>
            </div>
        </div>
        
        <div class="flex gap-3">
            <button type="button" onclick="hideModal()" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 transition-all duration-300">
                Batal
            </button>
            <button type="button" onclick="confirmDeleteHutang('${id}')" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-all duration-300">
                Hapus
            </button>
        </div>
    `;

    showModal(modalContent);
}

// Confirm delete hutang
async function confirmDeleteHutang(id) {
    hutangList = hutangList.filter(h => h.id != id);
    await saveData('Hutang');
    displayHutang();
    updateSummaryHutang();
    hideModal();
    showNotification('Data hutang berhasil dihapus!', 'success');
}

// Bayar cicilan
function bayarCicilan(hutangId) {
    const hutang = hutangList.find(h => h.id == hutangId);
    if (!hutang) return;

    const sisaHutang = hutang.jumlah - hutang.cicilan;

    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span class="text-lg">💰</span>
            </div>
            <h2 class="text-xl font-bold text-purple-600 mb-2">Bayar Cicilan</h2>
            <p class="text-gray-600 text-sm mb-4">Masukkan jumlah cicilan yang dibayar</p>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <p class="font-semibold text-gray-800">${hutang.nama}</p>
                <p class="text-sm text-gray-600">Hutang Awal: ${formatCurrency(hutang.jumlah)}</p>
                <p class="text-sm text-blue-600">Sudah Dibayar: ${formatCurrency(hutang.cicilan)}</p>
                <p class="text-lg font-bold text-red-600">Sisa Hutang: ${formatCurrency(sisaHutang)}</p>
            </div>
        </div>
        
        <form id="cicilan-form" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    💰 Jumlah Cicilan
                </label>
                <input type="number" id="jumlah-cicilan" class="w-full px-4 py-3 rounded-lg modern-input text-sm font-medium" placeholder="0" max="${sisaHutang}" required>
            </div>
            
            <div class="flex gap-3 pt-4">
                <button type="button" onclick="hideModal()" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 transition-all duration-300">
                    Batal
                </button>
                <button type="submit" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button">
                    Bayar Cicilan
                </button>
            </div>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('cicilan-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const jumlahCicilan = parseInt(document.getElementById('jumlah-cicilan').value);

        if (jumlahCicilan > 0 && jumlahCicilan <= sisaHutang) {
            hutangList = hutangList.map(h => {
                if (h.id == hutangId) {
                    h.cicilan += jumlahCicilan;
                    if (h.cicilan === h.jumlah) {
                        h.status = 'lunas';
                    }
                }
                return h;
            });

            await saveData('Hutang');
            displayHutang();
            updateSummaryHutang();
            hideModal();
            showNotification('Cicilan berhasil dibayar!', 'success');
        } else {
            alert('Jumlah cicilan tidak valid!');
        }
    });
}

// Kirim pesan WA
function kirimPesan(nomor, nama, jumlah) {
    const pesan = `Halo ${nama}, ini pengingat bahwa Anda memiliki hutang sebesar ${formatCurrency(jumlah)}. Mohon untuk segera dilunasi. Terima kasih!`;
    const url = `https://wa.me/${nomor.replace(/^0/, '62')}?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank');
    showNotification('Pengingat sudah dikirimkan via WhatsApp!', 'success');
}

// Kirim email
function kirimEmail(email, nama, jumlah) {
    const subject = 'Pengingat Hutang';
    const body = `Halo ${nama},\n\nIni pengingat bahwa Anda memiliki hutang sebesar ${formatCurrency(jumlah)}.\nMohon untuk segera dilunasi.\n\nTerima kasih!`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
    showNotification('Pengingat sudah dikirimkan via Email!', 'success');
}

// Lunaskan hutang
function lunaskanHutang(id) {
    const hutang = hutangList.find(h => h.id == id);
    if (!hutang) return;

    const modalContent = `
        <div class="text-center mb-6">
            <div class="w-12 h-12 gradient-income rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span class="text-lg">✅</span>
            </div>
            <h2 class="text-xl font-bold text-green-600 mb-2">Tandai Sebagai Hutang Yang Sudah Lunas</h2>
            <p class="text-gray-600 text-sm mb-4">Apakah Anda yakin hutang ini sudah lunas?</p>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <p class="font-semibold text-gray-800">${hutang.nama}</p>
                <p class="text-lg font-bold text-purple-600">${formatCurrency(hutang.jumlah)}</p>
                ${hutang.keterangan ? `<p class="text-sm text-gray-500">${hutang.keterangan}</p>` : ''}
                <p class="text-sm text-gray-500">${formatDateIndonesian(hutang.tanggal)}</p>
            </div>
        </div>
        
        <div class="flex gap-3">
            <button type="button" onclick="hideModal()" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 transition-all duration-300">
                Batal
            </button>
            <button type="button" onclick="confirmLunaskanHutang('${id}')" class="flex-1 px-4 py-3 rounded-lg font-semibold text-sm gradient-income text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button">
                Konfirmasi
            </button>
        </div>
    `;

    showModal(modalContent);
}

// Confirm lunaskan hutang
async function confirmLunaskanHutang(id) {
    hutangList = hutangList.map(h => {
        if (h.id == id) {
            h.status = 'lunas';
            h.cicilan = h.jumlah;
        }
        return h;
    });

    await saveData('Hutang');
    displayHutang();
    updateSummaryHutang();
    hideModal();
    showNotification('Hutang sudah lunas!', 'success');
}

// Update form appearance based on transaction type
function updateFormAppearance(type) {
    const formIcon = document.getElementById('form-icon');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');

    if (type === 'pemasukan') {
        formIcon.className = 'w-10 h-10 md:w-12 md:h-12 gradient-income rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-4 shadow-lg';
        formIcon.innerHTML = '<span class="text-base md:text-lg">💰</span>';
        formTitle.textContent = 'Tambah Pemasukan';
        formTitle.className = 'text-lg md:text-xl font-bold text-green-600 mb-1 md:mb-2';
        submitBtn.className = 'w-full px-6 py-2 md:px-8 md:py-3 rounded-lg font-bold text-sm gradient-income text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button';
        submitBtn.innerHTML = 'Tambah Pemasukan';
    } else if (type === 'pengeluaran') {
        formIcon.className = 'w-10 h-10 md:w-12 md:h-12 gradient-expense rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-4 shadow-lg';
        formIcon.innerHTML = '<span class="text-base md:text-lg">💸</span>';
        formTitle.textContent = 'Tambah Pengeluaran';
        formTitle.className = 'text-lg md:text-xl font-bold text-red-600 mb-1 md:mb-2';
        submitBtn.className = 'w-full px-6 py-2 md:px-8 md:py-3 rounded-lg font-bold text-sm gradient-expense text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button';
        submitBtn.innerHTML = 'Tambah Pengeluaran';
    } else {
        formIcon.className = 'w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-4 shadow-lg';
        formIcon.innerHTML = '<span class="text-base md:text-lg">📝</span>';
        formTitle.textContent = 'Tambah Transaksi Baru';
        formTitle.className = 'text-lg md:text-xl font-bold text-blue-600 mb-1 md:mb-2';
        submitBtn.className = 'w-full px-6 py-2 md:px-8 md:py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:scale-105 transition-all duration-300 shadow-lg modern-button';
        submitBtn.innerHTML = 'Tambah Transaksi';
    }
}

// Event listeners
document.getElementById('jenis-transaksi').addEventListener('change', function (e) {
    updateFormAppearance(e.target.value);
});

document.getElementById('form-transaksi').addEventListener('submit', function (e) {
    e.preventDefault();
    const type = document.getElementById('jenis-transaksi').value;
    const description = document.getElementById('keterangan-transaksi').value;
    const amount = document.getElementById('jumlah-transaksi').value;

    if (!type) {
        alert('Silakan pilih jenis transaksi terlebih dahulu!');
        return;
    }

    addTransaction(type, description, amount);
    this.reset();
    updateFormAppearance('');
});

document.getElementById('form-hutang').addEventListener('submit', function (e) {
    e.preventDefault();
    const nama = document.getElementById('nama-penghutang').value;
    const jumlah = document.getElementById('jumlah-hutang').value;
    const keterangan = document.getElementById('keterangan-hutang').value;
    const whatsapp = document.getElementById('whatsapp-penghutang').value;
    const email = document.getElementById('email-penghutang').value;

    addHutang(nama, jumlah, keterangan, whatsapp, email);
    this.reset();
});

// New functions for Google Apps Script integration
async function loadData() {
    try {
        const response = await fetch(SPREADSHEET_URL + '?action=getData');
        const data = await response.json();

        transaksi = data.keuangan.map(item => {
            return {
                ...item,
                id: parseInt(item.id),
                amount: parseInt(item.amount),
            };
        });

        hutangList = data.hutang.map(item => {
            return {
                ...item,
                id: parseInt(item.id),
                jumlah: parseInt(item.jumlah),
                cicilan: parseInt(item.cicilan || 0),
                sisaHutang: parseInt(item.sisaHutang || 0)
            };
        });

        displayTransactions();
        updateSummary();
        displayHutang();
        updateSummaryHutang();

        console.log('Data loaded successfully from Google Sheets.');
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        showNotification('Gagal memuat data dari Google Sheets. Pastikan URL skrip sudah benar.', 'error');
    }
}

async function saveData(sheetName) {
    try {
        // Buat salinan data dengan format tanggal yang baru
        const formattedTransaksi = transaksi.map(t => ({
            ...t,
            date: formatDateIndonesian(t.date)
        }));

        const formattedHutangList = hutangList.map(h => ({
            ...h,
            tanggal: formatDateIndonesian(h.tanggal)
        }));

        const dataToSend = {
            action: 'saveData',
            sheet: sheetName,
            data: {
                keuangan: formattedTransaksi,
                hutang: formattedHutangList
            }
        };

        const response = await fetch(SPREADSHEET_URL, {
            method: 'POST',
            body: JSON.stringify(dataToSend),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        const result = await response.json();
        if (result.status === 'success') {
            console.log('Data saved successfully to Google Sheets.');
        } else {
            console.error('Error saving data:', result.message);
            showNotification('Gagal menyimpan data ke Google Sheets.', 'error');
        }
    } catch (error) {
        console.error('Error saving data to Google Sheets:', error);
        showNotification('Gagal menyimpan data ke Google Sheets.', 'error');
    }
}


// Initialize
loadData();