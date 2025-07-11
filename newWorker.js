// newsWorker.js
// This Web Worker is responsible for processing raw news data fetched from the Google Sheet.
// It offloads the data parsing from the main thread, preventing UI freezes.

self.onmessage = (e) => {
    // Check the type of message received from the main thread
    if (e.data.type === 'processNews') {
        const rows = e.data.rows; // Raw data rows from the Google Sheet
        const processedNews = []; // Array to store processed news items
        const imageUrls = []; // Array to store image URLs for preloading

        // Iterate through rows, skipping the header row (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Create a news item object from the row data
            const newsItem = {
                rank: parseInt(row[0]) || 0, // Parse rank as integer, default to 0
                headline: row[1]?.trim() || 'शीर्षक उपलब्ध नहीं', // Trim headline, provide fallback
                source: row[2]?.trim() || 'अज्ञात स्रोत', // Trim source, provide fallback
                date: row[3]?.trim() || new Date().toISOString().split('T')[0], // Trim date, provide current date as fallback
                description: row[4]?.trim() || 'कोई विवरण उपलब्ध नहीं है।', // Trim description, provide fallback
                link: row[5]?.trim() || '#', // Trim link, provide fallback
                category: row[6]?.trim() || 'General', // Trim category, provide fallback
                // Trim image URL, provide a placeholder if missing or invalid
                image: row[7]?.trim() || 'https://placehold.co/400x300/e0e0e0/ffffff?text=Image+Not+Available'
            };
            processedNews.push(newsItem); // Add processed news item to array

            // Collect valid image URLs for preloading, excluding placeholder images
            if (newsItem.image && !newsItem.image.includes('placehold.co')) {
                imageUrls.push(newsItem.image);
            }
        }

        // Post the processed news data and image URLs back to the main thread
        self.postMessage({ type: 'newsProcessed', processedNews, imageUrls });
    }
};
