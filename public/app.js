"use strict";

const API_BASE = "/api";

console.log("SALE-IA-V2 iniciado");

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM carregado");

    // ================================================
    // NAVEGACAO
    // ================================================

    document.querySelectorAll(".nav-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            e.preventDefault();

            const section = btn.getAttribute("data-section");

            if (section) {
                showSection(section);
            }
        });
    });

    // ================================================
    // BOTAO ATUALIZAR WEBSITE FACTORY
    // ================================================

    const btnRefresh = document.getElementById("btnRefreshSites");

    if (btnRefresh) {
        btnRefresh.addEventListener("click", function () {
            loadWebsiteFactory();
        });
    }

    // ================================================
    // CARREGAR DASHBOARD
    // ================================================

    console.log("Carregando dashboard...");

    loadDashboard().catch(function (error) {
        console.error("Erro inicial do dashboard:", error);
    });
});


// ====================================================
// NAVEGACAO ENTRE SECOES
// ====================================================

function showSection(sectionId) {
    console.log("Navegando para:", sectionId);

    document.querySelectorAll(".section").forEach(function (section) {
        section.classList.remove("active");
    });

    const target = document.getElementById(sectionId);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(function (button) {
        button.classList.remove("active");
    });

    const activeBtn = document.querySelector(
        '[data-section="' + sectionId + '"]'
    );

    if (activeBtn) {
        activeBtn.classList.add("active");
    }

    // Carregamentos especificos
    if (sectionId === "dashboard") {
        loadDashboard();
    }

    if (sectionId === "leads") {
        loadLeads();
    }

    if (sectionId === "sites") {
        loadWebsiteFactory();
    }
}


// ====================================================
// DASHBOARD
// ====================================================

async function loadDashboard() {
    console.log("Funcao loadDashboard chamada");

    const metricsDiv = document.getElementById("salesMetrics");

    if (!metricsDiv) {
        console.warn("Elemento salesMetrics nao encontrado");
        return;
    }

    try {
        console.log(
            "Buscando:",
            API_BASE + "/dashboard/overview"
        );

        const response = await fetch(
            API_BASE + "/dashboard/overview",
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        console.log("Status:", response.status);

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        console.log("Dados recebidos:", data);

        // --------------------------------------------
        // CARDS
        // --------------------------------------------

        const el1 = document.getElementById("statTotalLeads");
        const el2 = document.getElementById("statNewLeads");
        const el3 = document.getElementById("statPixGenerated");
        const el4 = document.getElementById("statRevenue");

        if (el1) {
            el1.textContent = data.totalLeads || 0;
        }

        if (el2) {
            el2.textContent = data.newLeads || 0;
        }

        if (el3) {
            el3.textContent = data.pixGenerated || 0;
        }

        if (el4) {
            const revenue = Number(data.monthlyRevenue || 0);

            el4.textContent =
                "R$ " +
                revenue.toFixed(2).replace(".", ",");
        }

        // --------------------------------------------
        // AREA DE METRICAS
        // --------------------------------------------

        const totalLeads = data.totalLeads || 0;
        const newLeads = data.newLeads || 0;
        const pixGenerated = data.pixGenerated || 0;
        const revenue = Number(data.monthlyRevenue || 0);

        metricsDiv.innerHTML =
            '<div style="padding:2rem;text-align:center;">' +
                '<p style="font-size:1.2rem;font-weight:600;margin-bottom:1rem;">' +
                    'Metricas carregadas' +
                '</p>' +

                '<div style="' +
                    'display:grid;' +
                    'grid-template-columns:repeat(2,1fr);' +
                    'gap:1rem;' +
                    'text-align:left;' +
                    'padding:1.5rem;' +
                    'border-radius:.75rem;' +
                '">' +

                    '<div><strong>Total Leads:</strong> ' +
                        totalLeads +
                    '</div>' +

                    '<div><strong>Novos Leads:</strong> ' +
                        newLeads +
                    '</div>' +

                    '<div><strong>PIX Gerados:</strong> ' +
                        pixGenerated +
                    '</div>' +

                    '<div><strong>Receita:</strong> R$ ' +
                        revenue.toFixed(2).replace(".", ",") +
                    '</div>' +

                '</div>' +
            '</div>';

        console.log("Dashboard atualizado com sucesso");

    } catch (error) {

        console.error(
            "Erro ao carregar dashboard:",
            error
        );

        metricsDiv.innerHTML =
            '<div style="padding:2rem;text-align:center;">' +

                '<p style="font-weight:600;font-size:1.1rem;margin-bottom:1rem;">' +
                    'Erro ao carregar metricas' +
                '</p>' +

                '<p>' +
                    escapeHtml(error.message) +
                '</p>' +

                '<button ' +
                    'type="button" ' +
                    'onclick="loadDashboard()" ' +
                    'style="margin-top:1rem;padding:.75rem 1.5rem;border:none;border-radius:.5rem;cursor:pointer;"' +
                '>' +
                    'Tentar Novamente' +
                '</button>' +

            '</div>';
    }
}


// ====================================================
// LEADS
// ====================================================

async function loadLeads() {
    console.log("Carregando leads...");

    const container =
        document.getElementById("leadsList");

    if (!container) {
        console.warn("leadsList nao encontrado");
        return;
    }

    container.innerHTML =
        '<div class="loading">' +
            '<div class="spinner"></div>' +
            '<p>Carregando leads...</p>' +
        '</div>';

    try {

        const res = await fetch(
            API_BASE + "/leads"
        );

        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();

        const leads = data.leads || [];

        if (leads.length === 0) {

            container.innerHTML =
                '<p style="text-align:center;padding:2rem;">' +
                    'Nenhum lead encontrado.' +
                '</p>';

            return;
        }

        let html =
            '<table class="data-table">' +
                '<thead>' +
                    '<tr>' +
                        '<th>Nome</th>' +
                        '<th>Telefone</th>' +
                        '<th>Status</th>' +
                        '<th>Stage</th>' +
                        '<th>Score</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>';

        leads.forEach(function (lead) {

            const statusClass =
                getStatusClass(lead.status);

            html +=
                '<tr>' +

                    '<td><strong>' +
                        escapeHtml(lead.name || "N/A") +
                    '</strong></td>' +

                    '<td>' +
                        escapeHtml(lead.phone || "N/A") +
                    '</td>' +

                    '<td>' +
                        '<span class="badge ' +
                            statusClass +
                        '">' +
                            escapeHtml(lead.status || "N/A") +
                        '</span>' +
                    '</td>' +

                    '<td>' +
                        escapeHtml(lead.stage || "N/A") +
                    '</td>' +

                    '<td>' +
                        (lead.score || 0) +
                    '</td>' +

                '</tr>';
        });

        html +=
                "</tbody>" +
            "</table>";

        container.innerHTML = html;

    } catch (error) {

        console.error(
            "Erro leads:",
            error
        );

        container.innerHTML =
            '<p style="text-align:center;padding:2rem;">' +
                'Erro: ' +
                escapeHtml(error.message) +
            '</p>';
    }
}


// ====================================================
// STATUS
// ====================================================

function getStatusClass(status) {

    const map = {
        NEW_LEAD: "badge-info",
        QUALIFICATION: "badge-warning",
        NEGOTIATION: "badge-warning",
        CLOSED_WON: "badge-success",
        CLOSED_LOST: "badge-danger"
    };

    return map[status] || "badge-info";
}


// ====================================================
// WEBSITE FACTORY
// ====================================================

async function loadWebsiteFactory() {

    console.log(
        "Carregando Website Factory..."
    );

    const container =
        document.getElementById("wf-content");

    if (!container) {
        console.warn("wf-content nao encontrado");
        return;
    }

    container.innerHTML =
        '<div class="loading">' +
            '<div class="spinner"></div>' +
            '<p>Carregando prospects...</p>' +
        '</div>';

    try {

        const results =
            await Promise.all([

                fetch(
                    API_BASE +
                    "/site-sales/prospects"
                ),

                fetch(
                    API_BASE +
                    "/websites/demos"
                ).catch(function () {
                    return {
                        ok: false,
                        json: async function () {
                            return {
                                demos: []
                            };
                        }
                    };
                })

            ]);

        const prospectsRes = results[0];
        const demosRes = results[1];

        const prospectsData =
            prospectsRes.ok
                ? await prospectsRes.json()
                : { prospects: [] };

        const demosData =
            demosRes.ok
                ? await demosRes.json()
                : { demos: [] };

        const prospects =
            prospectsData.prospects || [];

        const demos =
            demosData.demos || [];

        console.log(
            "Prospects:",
            prospects.length,
            "Demos:",
            demos.length
        );

        const s1 =
            document.getElementById("wf-total");

        const s2 =
            document.getElementById("wf-demos");

        const s3 =
            document.getElementById("wf-proposals");

        const s4 =
            document.getElementById("wf-converted");

        if (s1) {
            s1.textContent =
                prospects.length;
        }

        if (s2) {
            s2.textContent =
                demos.filter(function (d) {
                    return d.status === "READY";
                }).length;
        }

        if (s3) {
            s3.textContent =
                prospects.filter(function (p) {
                    return p.status === "PROPOSAL_SENT";
                }).length;
        }

        if (s4) {
            s4.textContent =
                prospects.filter(function (p) {
                    return p.status === "NEGOCIACAO";
                }).length;
        }

        if (prospects.length === 0) {

            container.innerHTML =
                '<div style="text-align:center;padding:3rem;">' +

                    '<p style="font-size:3rem;margin-bottom:1rem;">🌐</p>' +

                    '<p style="font-size:1.1rem;margin-bottom:1rem;">' +
                        'Nenhum prospect encontrado' +
                    '</p>' +

                    '<p>' +
                        'Clique em "Nova Prospecção" para começar' +
                    '</p>' +

                '</div>';

            return;
        }

        let html =
            '<table class="data-table">' +

                '<thead>' +
                    '<tr>' +
                        '<th>Empresa</th>' +
                        '<th>Segmento</th>' +
                        '<th>Cidade</th>' +
                        '<th>Site Atual</th>' +
                        '<th>Score</th>' +
                        '<th>Status</th>' +
                        '<th>Acoes</th>' +
                    '</tr>' +
                '</thead>' +

                '<tbody>';

        prospects.forEach(function (p) {

            let siteStatus;

            if (
                p.websiteStatus ===
                "NO_WEBSITE"
            ) {

                siteStatus =
                    '<span class="badge badge-danger">' +
                        'Sem Site' +
                    '</span>';

            } else if (
                p.websiteStatus ===
                "WEBSITE_POOR"
            ) {

                siteStatus =
                    '<span class="badge badge-warning">' +
                        'Site Ruim' +
                    '</span>';

            } else {

                siteStatus =
                    '<span class="badge badge-success">' +
                        'Tem Site' +
                    '</span>';
            }

            let statusBadge;

            if (p.status === "DEMO_READY") {

                statusBadge =
                    '<span class="badge badge-success">' +
                        'Demo Pronta' +
                    '</span>';

            } else if (
                p.status ===
                "PROPOSAL_SENT"
            ) {

                statusBadge =
                    '<span class="badge badge-warning">' +
                        'Proposta' +
                    '</span>';

            } else if (
                p.status ===
                "NEGOCIACAO"
            ) {

                statusBadge =
                    '<span class="badge badge-info">' +
                        'Negociação' +
                    '</span>';

            } else {

                statusBadge =
                    '<span class="badge badge-info">' +
                        escapeHtml(
                            p.status || "Novo"
                        ) +
                    '</span>';
            }

            html +=
                '<tr>' +

                    '<td><strong>' +
                        escapeHtml(
                            p.companyName || "N/A"
                        ) +
                    '</strong></td>' +

                    '<td>' +
                        escapeHtml(
                            p.segment || "-"
                        ) +
                    '</td>' +

                    '<td>' +
                        escapeHtml(
                            p.city || "-"
                        ) +
                    '</td>' +

                    '<td>' +
                        siteStatus +
                    '</td>' +

                    '<td><strong>' +
                        (p.score || 0) +
                        '/100</strong></td>' +

                    '<td>' +
                        statusBadge +
                    '</td>' +

                    '<td style="display:flex;gap:.5rem;flex-wrap:wrap;">';

            if (
                p.websiteStatus === "UNKNOWN" ||
                p.websiteStatus === "NO_WEBSITE" ||
                p.websiteStatus === "WEBSITE_POOR"
            ) {

                html +=
                    '<button ' +
                        'class="btn btn-sm btn-primary" ' +
                        'type="button" ' +
                        'onclick="generateWebsiteDemo(' +
                            "'" +
                            escapeJsString(p.id) +
                            "'" +
                        ')"' +
                    '>' +
                        'Gerar Demo' +
                    '</button>';
            }

            if (
                p.status === "DEMO_READY" ||
                p.status === "PROPOSAL_SENT"
            ) {

                html +=
                    '<button ' +
                        'class="btn btn-sm btn-success" ' +
                        'type="button" ' +
                        'onclick="viewWebsiteDemo(' +
                            "'" +
                            escapeJsString(p.id) +
                            "'" +
                        ')"' +
                    '>' +
                        'Ver Demo' +
                    '</button>';
            }

            if (
                p.status !== "NEGOCIACAO"
            ) {

                html +=
                    '<button ' +
                        'class="btn btn-sm btn-secondary" ' +
                        'type="button" ' +
                        'onclick="convertWebsiteToLead(' +
                            "'" +
                            escapeJsString(p.id) +
                            "'" +
                        ')"' +
                    '>' +
                        'Virar Lead' +
                    '</button>';
            }

            html +=
                    '</td>' +
                '</tr>';
        });

        html +=
                '</tbody>' +
            '</table>';

        container.innerHTML = html;

    } catch (error) {

        console.error(
            "Erro Website Factory:",
            error
        );

        container.innerHTML =
            '<p style="text-align:center;padding:2rem;">' +
                'Erro: ' +
                escapeHtml(error.message) +
            '</p>';
    }
}


// ====================================================
// GERAR DEMO
// ====================================================

async function generateWebsiteDemo(
    prospectId
) {

    try {

        const res = await fetch(
            API_BASE + "/websites/generate",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    prospectId:
                        prospectId
                })
            }
        );

        const data =
            await res.json();

        if (data.success) {

            alert(
                "Demo gerada! Versão: " +
                (data.version || "1")
            );

            loadWebsiteFactory();

        } else {

            alert(
                "Erro: " +
                (data.error ||
                    "Falha ao gerar")
            );
        }

    } catch (error) {

        alert(
            "Erro: " +
            error.message
        );
    }
}


// ====================================================
// VISUALIZAR DEMO
// ====================================================

async function viewWebsiteDemo(
    prospectId
) {

    try {

        const res = await fetch(
            API_BASE + "/websites/demos"
        );

        const data =
            await res.json();

        const demo =
            (data.demos || []).find(
                function (d) {
                    return d.prospectId === prospectId;
                }
            );

        if (
            demo &&
            demo.sourceCode
        ) {

            const w =
                window.open(
                    "",
                    "_blank"
                );

            if (!w) {

                alert(
                    "O navegador bloqueou a nova janela."
                );

                return;
            }

            w.document.open();

            w.document.write(
                demo.sourceCode
            );

            w.document.close();

        } else {

            alert(
                "Demo não encontrada."
            );
        }

    } catch (error) {

        alert(
            "Erro: " +
            error.message
        );
    }
}


// ====================================================
// CONVERTER PROSPECT EM LEAD
// ====================================================

async function convertWebsiteToLead(
    prospectId
) {

    if (
        !confirm(
            "Converter este prospect em Lead?"
        )
    ) {
        return;
    }

    try {

        const res = await fetch(
            API_BASE +
            "/site-sales/prospects/" +
            encodeURIComponent(prospectId) +
            "/convert-lead",
            {
                method: "POST"
            }
        );

        const data =
            await res.json();

        if (data.success) {

            alert(
                "Convertido! Lead ID: " +
                (
                    data.lead &&
                    data.lead.id
                        ? data.lead.id
                        : ""
                )
            );

            loadWebsiteFactory();

        } else {

            alert(
                "Erro: " +
                (
                    data.error ||
                    "Falha"
                )
            );
        }

    } catch (error) {

        alert(
            "Erro: " +
            error.message
        );
    }
}


// ====================================================
// SEGURANCA / UTILITARIOS
// ====================================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeJsString(value) {

    if (value === null ||
        value === undefined) {
        return "";
    }

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}


// ====================================================
// DISPONIBILIZAR FUNCOES PARA HTML
// ====================================================

window.showSection =
    showSection;

window.loadDashboard =
    loadDashboard;

window.loadLeads =
    loadLeads;

window.loadWebsiteFactory =
    loadWebsiteFactory;

window.generateWebsiteDemo =
    generateWebsiteDemo;

window.viewWebsiteDemo =
    viewWebsiteDemo;

window.convertWebsiteToLead =
    convertWebsiteToLead;

console.log(
    "SALE-IA-V2 frontend carregado com sucesso"
);