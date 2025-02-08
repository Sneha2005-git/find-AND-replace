document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const oldWordInput = document.getElementById("oldWord");
    const newWordInput = document.getElementById("newWord");
    const replaceBtn = document.getElementById("replaceBtn");

    replaceBtn.addEventListener("click", async () => {
        const file = fileInput.files[0];
        const oldWord = oldWordInput.value.trim();
        const newWord = newWordInput.value.trim();

        if (!file) return alert("Please upload a PDF file.");
        if (!oldWord) return alert("Enter the word to replace.");
        if (oldWord === newWord) return alert("New word must be different.");

        try {
            const fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = async function () {
                const pdfBytes = new Uint8Array(fileReader.result);
                const modifiedPdfBytes = await replaceTextWithoutBreaking(pdfBytes, oldWord, newWord);
                
                
                const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
                downloadPdf(blob, file.name);
            };
        } catch (error) {
            console.error(error);
            alert("Error processing the PDF.");
        }
    });

    async function replaceTextWithoutBreaking(pdfBytes, oldWord, newWord) {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        for (const page of pages) {
            const { width, height } = page.getSize();
            const textContent = await extractTextFromPage(page);

            for (const item of textContent.items) {
                if (item.str.includes(oldWord)) {
                    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica); // Default font
                    const bgColor = PDFLib.rgb(1, 1, 1); // White background

                    const modifiedText = item.str.replace(new RegExp(oldWord, "g"), newWord);
                    const adjustedWidth = item.width * (newWord.length / oldWord.length);

                    // ✅ Properly erase old text with background color
                    page.drawRectangle({
                        x: item.transform[4],
                        y: height - item.transform[5],
                        width: adjustedWidth,
                        height: item.height,
                        color: bgColor,
                    });

                    // ✅ Draw new text in the same position
                    page.drawText(modifiedText, {
                        x: item.transform[4],
                        y: height - item.transform[5],
                        font,
                        size: item.height,
                        color: PDFLib.rgb(0, 0, 0),
                    });
                }
            }
        }

        return await pdfDoc.save();
    }

    async function extractTextFromPage(page) {
        try {
            const textContent = await page.getTextContent();
            return textContent;
        } catch {
            console.error("Failed to extract text.");
            return { items: [] };
        }
    }

    function downloadPdf(blob, fileName) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName.replace(".pdf", "_modified.pdf");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});