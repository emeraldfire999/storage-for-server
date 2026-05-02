/* ========================= ⭐ AMAZON SCRAPER BACKEND ⭐ ========================= */

import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/amazon/:asin", async (req, res) => {
    const asin = req.params.asin;
    const url = `https://www.amazon.com/dp/${asin}`;

    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        /* ========================= ⭐ BASIC FIELDS ⭐ ========================= */

        const title =
            $("#productTitle").text().trim() ||
            $("h1.a-size-large.a-spacing-none").text().trim() ||
            null;

        const author =
            $(".author a").first().text().trim() ||
            $("a.contributorNameID").first().text().trim() ||
            null;

        /* ========================= ⭐ COVER IMAGE ⭐ ========================= */

        let cover =
            $("#imgBlkFront").attr("src") ||
            $("#ebooksImgBlkFront").attr("src") ||
            $("img#landingImage").attr("src") ||
            null;

        // Normalize protocol-less URLs
        if (cover && cover.startsWith("//")) {
            cover = "https:" + cover;
        }

        // Fallback cover
        if (!cover) {
            cover = "https://raw.githubusercontent.com/emeraldfire999/EmeraldFireBookVaultApp/main/repair-manual.png";
        }

        /* ========================= ⭐ DESCRIPTION ⭐ ========================= */

        let description =
            $("#bookDescription_feature_div").text().trim() ||
            $("#productDescription").text().trim() ||
            $("div#editorialReviews_feature_div").text().trim() ||
            null;

        if (description) {
            description = description.replace(/\s+/g, " ").trim();
        }
/* ========================= ⭐ PUBLICATION / PRINT DATE ⭐ ========================= */

let publicationDate = null;

// 0. New: Detail bullets with label + value in separate spans
$("#detailBullets_feature_div li").each((i, el) => {
    const label = $(el).find("span.a-text-bold").text().trim();
    if (label === "Publication date") {
        const value = $(el).text().replace(label, "").trim();
        publicationDate = value;
    }
});

// 1. Standard bullet list (older layout)
if (!publicationDate) {
    $("li").each((i, el) => {
        const text = $(el).text().trim();
        if (text.startsWith("Publication date")) {
            publicationDate = text.replace("Publication date", "").trim();
        }
    });
}

// 2. Product details table
if (!publicationDate) {
    $("tr").each((i, el) => {
        const label = $(el).find("th").text().trim();
        if (label === "Publication date") {
            publicationDate = $(el).find("td").text().trim();
        }
    });
}

// 3. Kindle edition details block
if (!publicationDate) {
    const kindleBlock = $("div#detailBullets_feature_div").text();
    const match = kindleBlock.match(/Publication date\s*:\s*([A-Za-z0-9, ]+)/i);
    if (match) publicationDate = match[1].trim();
}

// 4. Paperback details block
if (!publicationDate) {
    const details = $("#productDetails_detailBullets_sections1").text();
    const match = details.match(/Publication date\s*:\s*([A-Za-z0-9, ]+)/i);
    if (match) publicationDate = match[1].trim();
}

// 5. Final cleanup
if (publicationDate) {
    publicationDate = publicationDate.replace(/\s+/g, " ").trim();
}
/* ========================= ⭐ SERIES NAME & NUMBER ⭐ ========================= */

let series = null;
let seriesNumber = null;

// 0. New: "Part of series" layout
$("#detailBullets_feature_div li").each((i, el) => {
    const label = $(el).find("span.a-text-bold").text().trim();
    if (label === "Part of series") {
        const value = $(el).text().replace(label, "").trim();
        series = value;
    }
});

// 1. Classic "Book X of Y: Series Name"
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

// 2. "Book X" without series name
if (!seriesNumber) {
    const match = $("a.a-link-normal:contains('Book')").first().text().trim().match(/Book\s+(\d+)/i);
    if (match) {
        seriesNumber = match[1];
    }
}

/* ========================= ⭐ ISBN ⭐ ========================= */

let isbn = null;

// A. Detail bullets (most common)
$("#detailBullets_feature_div li").each((i, el) => {
    const label = $(el).find("span.a-text-bold").text().trim();
    if (label === "ISBN-13" || label === "ISBN-10") {
        const value = $(el).text().replace(label, "").trim();
        isbn = value.replace(/[^0-9Xx-]/g, "").trim(); // clean formatting
    }
});

// B. Product details table
if (!isbn) {
    $("tr").each((i, el) => {
        const label = $(el).find("th").text().trim();
        if (label === "ISBN-13" || label === "ISBN-10") {
            isbn = $(el).find("td").text().trim();
        }
    });
}

// Final cleanup
if (isbn) {
    isbn = isbn.replace(/\s+/g, " ").trim();
}

        /* ========================= ⭐ SEND JSON BACK ⭐ ========================= */

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
        console.error("Amazon scraper error:", err);
        res.status(500).json({ error: "Failed to fetch Amazon data" });
    }
});

app.listen(3000, () => console.log("Backend running on port 3000"));