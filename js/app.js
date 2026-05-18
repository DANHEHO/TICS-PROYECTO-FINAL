// app.js - Lógica de la aplicación del taller mecánico

const clientForm = document.getElementById("clientForm");
const serviceForm = document.getElementById("serviceForm");
const clientTableBody = document.querySelector("#clientTable tbody");
const serviceTableBody = document.querySelector("#serviceTable tbody");
const serviceClientSelect = document.getElementById("serviceClient");
const statTotalServices = document.getElementById("statTotalServices");
const statTotalIncome = document.getElementById("statTotalIncome");
const statFinishedServices = document.getElementById("statFinishedServices");

let db;

// Nombres de claves en LocalStorage
const STORAGE_KEYS = {
    database: "tallerSqliteDb",
};

// Genera un id único simple para registros.
function generateId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
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

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            email TEXT,
            vehicle TEXT,
            plates TEXT,
            notes TEXT
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            clientId TEXT,
            type TEXT,
            description TEXT,
            cost REAL,
            status TEXT,
            parts TEXT,
            FOREIGN KEY(clientId) REFERENCES clients(id)
        );
    `);
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
        notes: row[6],
    }));
}

function queryServices() {
    const res = db.exec("SELECT * FROM services ORDER BY id DESC;");
    if (!res.length) return [];
    return res[0].values.map((row) => ({
        id: row[0],
        clientId: row[1],
        type: row[2],
        description: row[3],
        cost: row[4],
        status: row[5],
        parts: row[6],
    }));
}

function queryOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
}

async function initDatabase() {
    const SQL = await initSqlJs({ locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
    const savedDb = localStorage.getItem(STORAGE_KEYS.database);
    if (savedDb) {
        const bytes = base64ToUint8Array(savedDb);
        db = new SQL.Database(bytes);
    } else {
        db = new SQL.Database();
    }
    createTables();
    saveDatabase();
}

// Convierte número a formato de moneda local.
function formatCurrency(value) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(value);
}

// Muestra la sección seleccionada en la interfaz.
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

// Actualiza la lista desplegable de clientes en el formulario de servicios.
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

// Actualiza la tabla de clientes con datos actuales.
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
            <td>
                <button class="action-button edit-button" data-action="edit-client" data-id="${client.id}">Editar</button>
                <button class="action-button delete-button" data-action="delete-client" data-id="${client.id}">Eliminar</button>
            </td>
        `;
        clientTableBody.appendChild(row);
    });
}

// Actualiza la tabla de servicios con datos actuales.
function renderServices() {
    const services = queryServices();
    const clients = queryClients();

    serviceTableBody.innerHTML = "";

    services.forEach((service) => {
        const client = clients.find((c) => c.id === service.clientId) || { name: "Cliente eliminado" };
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${service.type}</td>
            <td>${formatCurrency(service.cost)}</td>
            <td><span class="status-pill status-${service.status.replace(/\s/g, "-")}">${service.status}</span></td>
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

// Muestra estadísticas generales de costos e ingresos.
function renderStats() {
    const services = queryServices();
    const totalIncome = services.reduce((sum, service) => sum + Number(service.cost), 0);
    const finishedCount = services.filter((service) => service.status === "Finalizado" || service.status === "Entregado").length;

    statTotalServices.textContent = services.length;
    statTotalIncome.textContent = formatCurrency(totalIncome);
    statFinishedServices.textContent = finishedCount;
}

// Limpia el formulario de cliente después de guardar o cancelar.
function clearClientForm() {
    clientForm.reset();
    document.getElementById("clientId").value = "";
}

// Limpia el formulario de servicio después de guardar o cancelar.
function clearServiceForm() {
    serviceForm.reset();
    document.getElementById("serviceId").value = "";
}

// Maneja el guardado y edición de clientes.
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
        document.getElementById("clientNotes").value.trim(),
    ];

    const existing = queryOne("SELECT id FROM clients WHERE id = ?", [id]);
    if (existing) {
        db.run(
            `UPDATE clients SET name = ?, phone = ?, email = ?, vehicle = ?, plates = ?, notes = ? WHERE id = ?`,
            clientData.slice(1).concat(id)
        );
    } else {
        db.run(
            `INSERT INTO clients (id, name, phone, email, vehicle, plates, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
        document.getElementById("serviceDescription").value.trim(),
        parseFloat(document.getElementById("serviceCost").value) || 0,
        document.getElementById("serviceStatus").value,
        document.getElementById("serviceParts").value.trim(),
    ];

    const existing = queryOne("SELECT id FROM services WHERE id = ?", [id]);
    if (existing) {
        db.run(
            `UPDATE services SET clientId = ?, type = ?, description = ?, cost = ?, status = ?, parts = ? WHERE id = ?`,
            serviceData.slice(1).concat(id)
        );
    } else {
        db.run(
            `INSERT INTO services (id, clientId, type, description, cost, status, parts) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            serviceData
        );
    }

    saveDatabase();
    clearServiceForm();
    renderServices();
}

// Llena los campos del formulario cuando se edita un cliente.
function editClient(id) {
    const row = queryOne("SELECT * FROM clients WHERE id = ?", [id]);
    if (!row) return;

    document.getElementById("clientId").value = row.id;
    document.getElementById("clientName").value = row.name;
    document.getElementById("clientPhone").value = row.phone;
    document.getElementById("clientEmail").value = row.email;
    document.getElementById("vehicleInfo").value = row.vehicle;
    document.getElementById("vehiclePlates").value = row.plates;
    document.getElementById("clientNotes").value = row.notes;
}

// Llena los campos del formulario cuando se edita un servicio.
function editService(id) {
    const row = queryOne("SELECT * FROM services WHERE id = ?", [id]);
    if (!row) return;

    document.getElementById("serviceId").value = row.id;
    document.getElementById("serviceClient").value = row.clientId;
    document.getElementById("serviceType").value = row.type;
    document.getElementById("serviceDescription").value = row.description;
    document.getElementById("serviceCost").value = row.cost;
    document.getElementById("serviceStatus").value = row.status;
    document.getElementById("serviceParts").value = row.parts;
}

// Elimina un cliente y actualiza tableros.
function deleteClient(id) {
    db.run("DELETE FROM clients WHERE id = ?", [id]);
    saveDatabase();
    populateClientSelect();
    renderClients();
}

// Elimina un servicio y actualiza métricas.
function deleteService(id) {
    db.run("DELETE FROM services WHERE id = ?", [id]);
    saveDatabase();
    renderServices();
}

// Maneja clicks sobre acciones de edición y eliminación.
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
                if (confirm("¿Deseas eliminar este registro de servicio?")) deleteService(id);
                break;
            default:
                break;
        }
    });
}

// Inicializa el sistema al cargar la página.
async function initApp() {
    await initDatabase();
    setupTabs();
    populateClientSelect();
    renderClients();
    renderServices();
    setupTableActions();

    clientForm.addEventListener("submit", handleClientSubmit);
    serviceForm.addEventListener("submit", handleServiceSubmit);
}

initApp();
