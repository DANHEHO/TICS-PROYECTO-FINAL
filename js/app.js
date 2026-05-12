// app.js - Lógica de la aplicación del taller mecánico

const clientForm = document.getElementById("clientForm");
const serviceForm = document.getElementById("serviceForm");
const clientTableBody = document.querySelector("#clientTable tbody");
const serviceTableBody = document.querySelector("#serviceTable tbody");
const serviceClientSelect = document.getElementById("serviceClient");
const statTotalServices = document.getElementById("statTotalServices");
const statTotalIncome = document.getElementById("statTotalIncome");
const statFinishedServices = document.getElementById("statFinishedServices");

// Nombres de claves en LocalStorage
const STORAGE_KEYS = {
    clients: "tallerClientes",
    services: "tallerServicios",
};

// Obtiene datos desde el localStorage o devuelve un arreglo vacío.
function loadData(key) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

// Guarda datos en el localStorage.
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Genera un id único simple para registros.
function generateId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
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
    const clients = loadData(STORAGE_KEYS.clients);
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
    const clients = loadData(STORAGE_KEYS.clients);
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
    const services = loadData(STORAGE_KEYS.services);
    const clients = loadData(STORAGE_KEYS.clients);

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
    const services = loadData(STORAGE_KEYS.services);
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

    const id = document.getElementById("clientId").value;
    const clientData = {
        name: document.getElementById("clientName").value.trim(),
        phone: document.getElementById("clientPhone").value.trim(),
        email: document.getElementById("clientEmail").value.trim(),
        vehicle: document.getElementById("vehicleInfo").value.trim(),
        plates: document.getElementById("vehiclePlates").value.trim(),
        notes: document.getElementById("clientNotes").value.trim(),
    };

    const clients = loadData(STORAGE_KEYS.clients);

    if (id) {
        const index = clients.findIndex((client) => client.id === id);
        if (index !== -1) {
            clients[index] = { ...clients[index], ...clientData };
        }
    } else {
        clients.push({ id: generateId(), ...clientData });
    }

    saveData(STORAGE_KEYS.clients, clients);
    clearClientForm();
    populateClientSelect();
    renderClients();
}

// Maneja el guardado y edición de servicios.
function handleServiceSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("serviceId").value;
    const serviceData = {
        clientId: document.getElementById("serviceClient").value,
        type: document.getElementById("serviceType").value,
        description: document.getElementById("serviceDescription").value.trim(),
        cost: parseFloat(document.getElementById("serviceCost").value) || 0,
        status: document.getElementById("serviceStatus").value,
        parts: document.getElementById("serviceParts").value.trim(),
    };

    const services = loadData(STORAGE_KEYS.services);

    if (id) {
        const index = services.findIndex((service) => service.id === id);
        if (index !== -1) {
            services[index] = { ...services[index], ...serviceData };
        }
    } else {
        services.push({ id: generateId(), ...serviceData });
    }

    saveData(STORAGE_KEYS.services, services);
    clearServiceForm();
    renderServices();
}

// Llena los campos del formulario cuando se edita un cliente.
function editClient(id) {
    const clients = loadData(STORAGE_KEYS.clients);
    const client = clients.find((client) => client.id === id);
    if (!client) return;

    document.getElementById("clientId").value = client.id;
    document.getElementById("clientName").value = client.name;
    document.getElementById("clientPhone").value = client.phone;
    document.getElementById("clientEmail").value = client.email;
    document.getElementById("vehicleInfo").value = client.vehicle;
    document.getElementById("vehiclePlates").value = client.plates;
    document.getElementById("clientNotes").value = client.notes;
}

// Llena los campos del formulario cuando se edita un servicio.
function editService(id) {
    const services = loadData(STORAGE_KEYS.services);
    const service = services.find((item) => item.id === id);
    if (!service) return;

    document.getElementById("serviceId").value = service.id;
    document.getElementById("serviceClient").value = service.clientId;
    document.getElementById("serviceType").value = service.type;
    document.getElementById("serviceDescription").value = service.description;
    document.getElementById("serviceCost").value = service.cost;
    document.getElementById("serviceStatus").value = service.status;
    document.getElementById("serviceParts").value = service.parts;
}

// Elimina un cliente y actualiza tableros.
function deleteClient(id) {
    const clients = loadData(STORAGE_KEYS.clients);
    const remaining = clients.filter((client) => client.id !== id);
    saveData(STORAGE_KEYS.clients, remaining);
    populateClientSelect();
    renderClients();
}

// Elimina un servicio y actualiza métricas.
function deleteService(id) {
    const services = loadData(STORAGE_KEYS.services);
    const remaining = services.filter((service) => service.id !== id);
    saveData(STORAGE_KEYS.services, remaining);
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
function initApp() {
    setupTabs();
    populateClientSelect();
    renderClients();
    renderServices();
    setupTableActions();

    clientForm.addEventListener("submit", handleClientSubmit);
    serviceForm.addEventListener("submit", handleServiceSubmit);
}

initApp();
