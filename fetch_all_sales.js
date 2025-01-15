const fetch = require('node-fetch');
const fs = require('fs');

const base64Auth = "Basic N2JkMzFiYTQtYjIwZS00NTU3LTgwYTMtYzFiNTM5YWU3NmZiOmYxOTUyN2U4LWY0NTktNGE2My05YTZjLWFkNDE1ZjhiNDcwOQ==";
const urlToken = "https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials";
const salesHistoryURL = "https://developers.hotmart.com/payments/api/v1/sales/history";

// Datas para o filtro
const startDate = new Date("2010-01-01").getTime(); // Data inicial ampla
const endDate = new Date().getTime(); // Data atual

async function getAccessToken() {
    const response = await fetch(urlToken, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": base64Auth,
        },
    });

    if (!response.ok) {
        throw new Error(`Erro ao obter access_token: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function fetchAllSales(accessToken) {
    let pageToken = "";
    let allSales = [];

    while (true) {
        // Montar URL com filtros explícitos
        const url = pageToken
            ? `${salesHistoryURL}?max_results=100&start_date=${startDate}&end_date=${endDate}&transaction_status=APPROVED,COMPLETE&page_token=${pageToken}`
            : `${salesHistoryURL}?max_results=100&start_date=${startDate}&end_date=${endDate}&transaction_status=APPROVED,COMPLETE`;

        console.log(`Buscando vendas: ${url}`);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar vendas: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data.items) {
            allSales.push(
                ...data.items.map((sale) => ({
                    name: sale.buyer?.name || "N/A",
                    email: sale.buyer?.email || "N/A",
                    product: sale.product?.name || "N/A",
                    value: sale.purchase?.price?.value || 0,
                    currency: sale.purchase?.price?.currency_code || "N/A",
                    date: sale.purchase?.approved_date
                        ? new Date(sale.purchase.approved_date).toLocaleDateString("pt-BR")
                        : "N/A",
                    paymentType: sale.purchase?.payment?.type || "N/A",
                    status: sale.purchase?.status || "N/A",
                    transaction: sale.purchase?.transaction || "N/A",
                }))
            );
        }

        console.log(
            `Página processada: ${data.items?.length || 0} vendas capturadas nesta página`
        );

        if (data.page_info?.next_page_token) {
            pageToken = data.page_info.next_page_token;
        } else {
            console.log("Não há mais páginas para processar.");
            break;
        }
    }

    return allSales;
}

(async () => {
    try {
        console.log("Obtendo access_token...");
        const accessToken = await getAccessToken();

        console.log("Buscando todas as vendas...");
        const sales = await fetchAllSales(accessToken);

        console.log(`Total de vendas capturadas: ${sales.length}`);
        fs.writeFileSync("all_sales.json", JSON.stringify(sales, null, 2));
        console.log("Todas as vendas salvas no arquivo 'all_sales.json'");
    } catch (error) {
        console.error("Erro ao executar o script:", error.message);
    }
})();