/* ========================= ⭐ AMAZON SCRAPER BACKEND ⭐ ========================= */

import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

console.log("📡 Scraper server starting…");

app.get("/api/amazon/:asin", async (req, res) => {
    const asin = req.params.asin;
    const url = `https://www.amazon.com/dp/${asin}`;

    console.log(`\n==============================`);
    console.log(`📘 Incoming request for ASIN: ${asin}`);
    console.log(`🌐 Fetching URL: ${url}`);

    try {
const response = await fetch(url, {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Referer": "https://www.amazon.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1"
    }
});


        console.log(`📥 Amazon responded with status: ${response.status}`);

        const html = await response.text();

        console.log(`📄 HTML received (first 300 chars):`);
        console.log(html.slice(0, 300));

        const $ = cheerio.load(html);
        console.log("🔍 HTML loaded into Cheerio");

        /* ========================= ⭐ BASIC FIELDS ⭐ ========================= */

        console.log("➡ Extracting title and author…");

        const title =
            $("#productTitle").text().trim() ||
            $("h1.a-size-large.a-spacing-none").text().trim() ||
            null;

        const author =
            $(".author a").first().text().trim() ||
            $("a.contributorNameID").first().text().trim() ||
            null;

        /* ========================= ⭐ COVER IMAGE ⭐ ========================= */

        console.log("➡ Extracting cover image…");

        let cover =
            $("#imgBlkFront").attr("src") ||
            $("#ebooksImgBlkFront").attr("src") ||
            $("img#landingImage").attr("src") ||
            null;

        if (cover && cover.startsWith("//")) {
            cover = "https:" + cover;
        }

        if (!cover) {
            cover = "https://raw.githubusercontent.com/emeraldfire999/EmeraldFireBookVaultApp/main/repair-manual.png";
        }

        /* ========================= ⭐ DESCRIPTION ⭐ ========================= */

        console.log("➡ Extracting description…");

        let description =
            $("#bookDescription_feature_div").text().trim() ||
            $("#productDescription").text().trim() ||
            $("div#editorialReviews_feature_div").text().trim() ||
            null;

        if (description) {
            description = description.replace(/\s+/g, " ").trim();
        }

        /* ========================= ⭐ PUBLICATION DATE ⭐ ========================= */

        console.log("➡ Extracting publication date…");

        let publicationDate = null;

        $("#detailBullets_feature_div li").each((i, el) => {
            const label = $(el).find("span.a-text-bold").text().trim();
            if (label === "Publication date") {
                const value = $(el).text().replace(label, "").trim();
                publicationDate = value;
            }
        });

        if (!publicationDate) {
            $("li").each((i, el) => {
                const text = $(el).text().trim();
                if (text.startsWith("Publication date")) {
                    publicationDate = text.replace("Publication date", "").trim();
                }
            });
        }

        if (!publicationDate) {
            $("tr").each((i, el) => {
                const label = $(el).find("th").text().trim();
                if (label === "Publication date") {
                    publicationDate = $(el).find("td").text().trim();
                }
            });
        }

        if (publicationDate) {
            publicationDate = publicationDate.replace(/\s+/g, " ").trim();
        }

        /* ========================= ⭐ SERIES ⭐ ========================= */

        console.log("➡ Extracting series info…");

        let series = null;
        let seriesNumber = null;

        $("#detailBullets_feature_div li").each((i, el) => {
            const label = $(el).find("span.a-text-bold").text().trim();
            if (label === "Part of series") {
                const value = $(el).text().replace(label, "").trim();
                series = value;
            }
        });

        if (!series) {
            const seriesBlock = $("a.a-link-normal:contains('Book')").first().text().trim();
            if (seriesBlock) {
                const match = seriesBlock.match(/Book\s+(\d+)\s+.*?:\s*(.+)/i);
                if (match) {
                    seriesNumber = match[1];
                    series = match[2];
                }
            }
        }

        if (!seriesNumber) {
            const match = $("a.a-link-normal:contains('Book')").first().text().trim().match(/Book\s+(\d+)/i);
            if (match) {
                seriesNumber = match[1];
            }
        }

        /* ========================= ⭐ ISBN ⭐ ========================= */

        console.log("➡ Extracting ISBN…");

        let isbn = null;

        $("#detailBullets_feature_div li").each((i, el) => {
            const label = $(el).find("span.a-text-bold").text().trim();
            if (label === "ISBN-13" || label === "ISBN-10") {
                const value = $(el).text().replace(label, "").trim();
                isbn = value.replace(/[^0-9Xx-]/g, "").trim();
            }
        });

        if (!isbn) {
            $("tr").each((i, el) => {
                const label = $(el).find("th").text().trim();
                if (label === "ISBN-13" || label === "ISBN-10") {
                    isbn = $(el).find("td").text().trim();
                }
            });
        }

        if (isbn) {
            isbn = isbn.replace(/\s+/g, " ").trim();
        }

        /* ========================= ⭐ SEND JSON BACK ⭐ ========================= */

        console.log("📤 Sending parsed data:");
        console.log({ title, author, cover, description, publicationDate, series, seriesNumber, isbn });

        res.json({
            asin,
            url,
            title,
            author,
            cover,
            description,
            publicationDate,
            series,
            seriesNumber,
            isbn
        });

    } catch (err) {
        console.error("❌ Amazon scraper error:", err);
        res.status(500).json({ error: "Failed to fetch Amazon data" });
    }
});

app.listen(3000, () => console.log("🚀 Backend running on port 3000"));
setInterval(() => {
    console.log("💓 Server heartbeat — still running");
}, 3000);
