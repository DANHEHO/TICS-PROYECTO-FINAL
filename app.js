// app.js - Sistema Taller Mecánico

const clientForm = document.getElementById("clientForm");
const serviceForm = document.getElementById("serviceForm");
const partsForm = document.getElementById("partsForm");

const clientTableBody = document.querySelector("#clientTable tbody");
const serviceTableBody = document.querySelector("#serviceTable tbody");
const partsTableBody = document.querySelector("#partsTable tbody");

const serviceClientSelect = document.getElementById("serviceClient");
const servicePartsSelect = document.getElementById("serviceParts");

const statTotalServices = document.getElementById("statTotalServices");
const statTotalIncome = document.getElementById("statTotalIncome");
const statFinishedServices = document.getElementById("statFinishedServices");

const totalIncome = document.getElementById("totalIncome");
const totalPartsCost = document.getElementById("totalPartsCost");
const estimatedProfit = document.getElementById("estimatedProfit");
const completedServices = document.getElementById("completedServices");

let db;

const STORAGE_KEYS = {
    database: "tallerSqliteDb",
};

function generateId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

function uint8ArrayToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
}

function saveDatabase() {
    const data = db.export();
    localStorage.setItem(STORAGE_KEYS.database, uint8ArrayToBase64(data));
}

function formatCurrency(value) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(value);
}

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            email TEXT,
            vehicle TEXT,
            plates TEXT,
            mileage TEXT,
            notes TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            clientId TEXT,
            type TEXT,
            date TEXT,
            description TEXT,
            labor REAL,
            cost REAL,
            status TEXT,
            payment TEXT,
            parts TEXT,
            FOREIGN KEY(clientId) REFERENCES clients(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS parts (
            id TEXT PRIMARY KEY,
            name TEXT,
            price REAL,
            stock INTEGER
        );
    `);
}

function insertDefaultParts() {
    const result = db.exec("SELECT COUNT(*) FROM parts;");
    const count = result[0].values[0][0];

    if (count > 0) return;

    const defaultParts = [
        ["Aceite de motor", 650, 15],
        ["Filtro de aceite", 180, 25],
        ["Filtro de aire", 250, 20],
        ["Bujías", 480, 12],
        ["Balatas delanteras", 950, 8],
        ["Balatas traseras", 850, 8],
        ["Batería", 2200, 5],
        ["Anticongelante", 320, 18],
        ["Amortiguador", 1350, 6],
        ["Banda de distribución", 1600, 4],
    ];

    defaultParts.forEach((part) => {
        db.run(
            "INSERT INTO parts (id, name, price, stock) VALUES (?, ?, ?, ?)",
            [generateId(), part[0], part[1], part[2]]
        );
    });
}

function queryOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
}

function queryClients() {
    const res = db.exec("SELECT * FROM clients ORDER BY name;");
    if (!res.length) return [];

    return res[0].values.map((row) => ({
        id: row[0],
        name: row[1],
        phone: row[2],
        email: row[3],
        vehicle: row[4],
        plates: row[5],
        mileage: row[6],
        notes: row[7],
    }));
}

function queryServices() {
    const res = db.exec("SELECT * FROM services ORDER BY id DESC;");
    if (!res.length) return [];

    return res[0].values.map((row) => ({
        id: row[0],
        clientId: row[1],
        type: row[2],
        date: row[3],
        description: row[4],
        labor: row[5],
        cost: row[6],
        status: row[7],
        payment: row[8],
        parts: row[9],
    }));
}

function queryParts() {
    const res = db.exec("SELECT * FROM parts ORDER BY name;");
    if (!res.length) return [];

    return res[0].values.map((row) => ({
        id: row[0],
        name: row[1],
        price: row[2],
        stock: row[3],
    }));
}

async function initDatabase() {
    const SQL = await initSqlJs({
        locateFile: (file) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
    });

    const savedDb = localStorage.getItem(STORAGE_KEYS.database);

    if (savedDb) {
        db = new SQL.Database(base64ToUint8Array(savedDb));
    } else {
        db = new SQL.Database();
    }

    createTables();
    insertDefaultParts();
    saveDatabase();
}

function setupTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const tabs = document.querySelectorAll(".tab-content");

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            buttons.forEach((btn) => btn.classList.remove("active"));
            tabs.forEach((tab) => tab.classList.remove("active"));

            button.classList.add("active");
            document.getElementById(button.dataset.tab).classList.add("active");
        });
    });
}

function populateClientSelect() {
    const clients = queryClients();

    serviceClientSelect.innerHTML = "<option value=''>Selecciona un cliente</option>";

    clients.forEach((client) => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = `${client.name} (${client.vehicle})`;
        serviceClientSelect.appendChild(option);
    });
}

function populatePartsSelect() {
    const parts = queryParts();

    servicePartsSelect.innerHTML = "<option value=''>Selecciona una refacción</option>";

    parts.forEach((part) => {
        const option = document.createElement("option");
        option.value = `${part.name} - ${formatCurrency(part.price)}`;
        option.textContent = `${part.name} - ${formatCurrency(part.price)}`;
        servicePartsSelect.appendChild(option);
    });
}

function renderClients() {
    const clients = queryClients();
    clientTableBody.innerHTML = "";

    clients.forEach((client) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.phone}</td>
            <td>${client.vehicle}</td>
            <td>${client.plates || "-"}</td>
            <td>${client.mileage || "-"}</td>
            <td>
                <button class="action-button edit-button" data-action="edit-client" data-id="${client.id}">Editar</button>
                <button class="action-button delete-button" data-action="delete-client" data-id="${client.id}">Eliminar</button>
            </td>
        `;

        clientTableBody.appendChild(row);
    });
}

function renderServices() {
    const services = queryServices();
    const clients = queryClients();

    serviceTableBody.innerHTML = "";

    services.forEach((service) => {
        const client = clients.find((c) => c.id === service.clientId) || {
            name: "Cliente eliminado",
        };

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${client.name}</td>
            <td>${service.type}</td>
            <td>${service.date || "-"}</td>
            <td>${formatCurrency(service.labor || 0)}</td>
            <td>${formatCurrency(service.cost || 0)}</td>
            <td><span class="status-pill status-${service.status.replace(/\s/g, "-")}">${service.status}</span></td>
            <td>${service.payment || "-"}</td>
            <td>${service.parts || "Ninguna"}</td>
            <td>
                <button class="action-button edit-button" data-action="edit-service" data-id="${service.id}">Editar</button>
                <button class="action-button delete-button" data-action="delete-service" data-id="${service.id}">Eliminar</button>
            </td>
        `;

        serviceTableBody.appendChild(row);
    });

    renderStats();
}

function renderParts() {
    const parts = queryParts();
    partsTableBody.innerHTML = "";

    parts.forEach((part) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${part.name}</td>
            <td>${formatCurrency(part.price)}</td>
            <td>${part.stock}</td>
            <td>
                <button class="action-button delete-button" data-action="delete-part" data-id="${part.id}">Eliminar</button>
            </td>
        `;

        partsTableBody.appendChild(row);
    });

    populatePartsSelect();
}

function renderStats() {
    const services = queryServices();

    const income = services.reduce((sum, service) => sum + Number(service.cost || 0), 0);

    const finishedCount = services.filter(
        (service) => service.status === "Finalizado" || service.status === "Entregado"
    ).length;

    const parts = queryParts();
    const partsCost = parts.reduce(
        (sum, part) => sum + Number(part.price || 0) * Number(part.stock || 0),
        0
    );

    const profit = income - partsCost;

    statTotalServices.textContent = services.length;
    statTotalIncome.textContent = formatCurrency(income);
    statFinishedServices.textContent = finishedCount;

    totalIncome.textContent = formatCurrency(income);
    totalPartsCost.textContent = formatCurrency(partsCost);
    estimatedProfit.textContent = formatCurrency(profit);
    completedServices.textContent = finishedCount;
}

function clearClientForm() {
    clientForm.reset();
    document.getElementById("clientId").value = "";
}

function clearServiceForm() {
    serviceForm.reset();
    document.getElementById("serviceId").value = "";
}

function clearPartsForm() {
    partsForm.reset();
}

function handleClientSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("clientId").value || generateId();

    const clientData = [
        id,
        document.getElementById("clientName").value.trim(),
        document.getElementById("clientPhone").value.trim(),
        document.getElementById("clientEmail").value.trim(),
        document.getElementById("vehicleInfo").value.trim(),
        document.getElementById("vehiclePlates").value.trim(),
        document.getElementById("vehicleMileage").value.trim(),
        document.getElementById("clientNotes").value.trim(),
    ];

    const existing = queryOne("SELECT id FROM clients WHERE id = ?", [id]);

    if (existing) {
        db.run(
            `UPDATE clients 
             SET name = ?, phone = ?, email = ?, vehicle = ?, plates = ?, mileage = ?, notes = ? 
             WHERE id = ?`,
            clientData.slice(1).concat(id)
        );
    } else {
        db.run(
            `INSERT INTO clients 
             (id, name, phone, email, vehicle, plates, mileage, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            clientData
        );
    }

    saveDatabase();
    clearClientForm();
    populateClientSelect();
    renderClients();
}

function handleServiceSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("serviceId").value || generateId();

    const serviceData = [
        id,
        document.getElementById("serviceClient").value,
        document.getElementById("serviceType").value,
        document.getElementById("serviceDate").value,
        document.getElementById("serviceDescription").value.trim(),
        parseFloat(document.getElementById("serviceLabor").value) || 0,
        parseFloat(document.getElementById("serviceCost").value) || 0,
        document.getElementById("serviceStatus").value,
        document.getElementById("paymentMethod").value,
        document.getElementById("serviceParts").value,
    ];

    const existing = queryOne("SELECT id FROM services WHERE id = ?", [id]);

    if (existing) {
        db.run(
            `UPDATE services 
             SET clientId = ?, type = ?, date = ?, description = ?, labor = ?, cost = ?, status = ?, payment = ?, parts = ? 
             WHERE id = ?`,
            serviceData.slice(1).concat(id)
        );
    } else {
        db.run(
            `INSERT INTO services 
             (id, clientId, type, date, description, labor, cost, status, payment, parts) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            serviceData
        );
    }

    saveDatabase();
    clearServiceForm();
    renderServices();
}

function handlePartsSubmit(event) {
    event.preventDefault();

    const name = document.getElementById("partName").value.trim();
    const price = parseFloat(document.getElementById("partPrice").value) || 0;
    const stock = parseInt(document.getElementById("partStock").value) || 0;

    if (!name) {
        alert("Escribe el nombre de la pieza");
        return;
    }

    db.run(
        "INSERT INTO parts (id, name, price, stock) VALUES (?, ?, ?, ?)",
        [generateId(), name, price, stock]
    );

    saveDatabase();
    clearPartsForm();
    renderParts();
    renderStats();
}

function editClient(id) {
    const row = queryOne("SELECT * FROM clients WHERE id = ?", [id]);
    if (!row) return;

    document.getElementById("clientId").value = row.id;
    document.getElementById("clientName").value = row.name;
    document.getElementById("clientPhone").value = row.phone;
    document.getElementById("clientEmail").value = row.email;
    document.getElementById("vehicleInfo").value = row.vehicle;
    document.getElementById("vehiclePlates").value = row.plates;
    document.getElementById("vehicleMileage").value = row.mileage;
    document.getElementById("clientNotes").value = row.notes;
}

function editService(id) {
    const row = queryOne("SELECT * FROM services WHERE id = ?", [id]);
    if (!row) return;

    document.getElementById("serviceId").value = row.id;
    document.getElementById("serviceClient").value = row.clientId;
    document.getElementById("serviceType").value = row.type;
    document.getElementById("serviceDate").value = row.date;
    document.getElementById("serviceDescription").value = row.description;
    document.getElementById("serviceLabor").value = row.labor;
    document.getElementById("serviceCost").value = row.cost;
    document.getElementById("serviceStatus").value = row.status;
    document.getElementById("paymentMethod").value = row.payment;
    document.getElementById("serviceParts").value = row.parts;
}

function deleteClient(id) {
    db.run("DELETE FROM clients WHERE id = ?", [id]);
    saveDatabase();
    populateClientSelect();
    renderClients();
}

function deleteService(id) {
    db.run("DELETE FROM services WHERE id = ?", [id]);
    saveDatabase();
    renderServices();
}

function deletePart(id) {
    db.run("DELETE FROM parts WHERE id = ?", [id]);
    saveDatabase();
    renderParts();
    renderStats();
}

function setupTableActions() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        switch (action) {
            case "edit-client":
                editClient(id);
                break;

            case "delete-client":
                if (confirm("¿Deseas eliminar este cliente?")) deleteClient(id);
                break;

            case "edit-service":
                editService(id);
                break;

            case "delete-service":
                if (confirm("¿Deseas eliminar este servicio?")) deleteService(id);
                break;

            case "delete-part":
                if (confirm("¿Deseas eliminar esta pieza?")) deletePart(id);
                break;
        }
    });
}

async function initApp() {
    await initDatabase();

    setupTabs();

    populateClientSelect();
    populatePartsSelect();

    renderClients();
    renderServices();
    renderParts();
    renderStats();

    setupTableActions();

    clientForm.addEventListener("submit", handleClientSubmit);
    serviceForm.addEventListener("submit", handleServiceSubmit);
    partsForm.addEventListener("submit", handlePartsSubmit);
}

initApp();