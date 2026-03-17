const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const PDFDocument = require('pdfkit');
require('dotenv').config();


const outDir = path.join(__dirname, '../../data/out');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Generar PDF
function generarPDF(nombreArchivo, titulos) {
    const doc = new PDFDocument();
    const filePath = path.join(outDir, nombreArchivo);

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text("Informe de Preguntas", { underline: true });
    doc.moveDown();

    titulos.forEach((t, i) => {
        doc.fontSize(12).text(`${i + 1}. ${t}`);
    });

    doc.end();
    console.log(`PDF generado en ${filePath}`);
}

// Excercici 2 part 1
async function consultaVistas(collection) {
    console.log("Calculant mitjana . . .");

    const media = await collection.aggregate([
        {$group:{_id: null, mediaViews:{$avg:{$toInt:"$question.ViewCount"}}}}]).toArray();
    // hacemos la media pero sin decimales para que no nosd e 5 digitos de estos
    const mediaViews = Math.round(media[0].mediaViews);
    console.log("Mitjana de Vistas:", mediaViews);
    
    const preguntas = await collection.find({
        $expr: {$gt: [{$toInt:"$question.ViewCount"}, mediaViews]}
    }).toArray();

    console.log("Preguntas amb vistas superiors a la mitjana:", preguntas.length);

    return preguntas.map(p => p.question.Title);
}

// Exercici 2 part 2

async function consultaTitulos(collection) {
    const palabras = ["pug", "wig", "yak", "nap", "jig", "mug", "zap", "gag", "oaf", "elf"];
    const regex = new RegExp(palabras.join("|"), "i");

    console.log("Preguntas con: pug, wig, yak, nap, jig, mug, zap, gag, oaf, elf\n");

    const preguntas = await collection.find({
        "question.Title": { $regex: regex }
    }).toArray();

    console.log("Preguntas trobades:", preguntas.length);

    return preguntas.map(p => p.question.Title);
}


async function main() {
    const uri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/';
    const client = new MongoClient(uri);

    try {
        await client.connect();
 
        console.log("Conectat correctament a MongoDB");

        const db = client.db("chess_db");
        const collection = db.collection("questions");

        // Fem les consultes y las guardem en pdf
        const titulos1 = await consultaVistas(collection);
        const titulos2 = await consultaTitulos(collection);

        generarPDF("informe1.pdf", titulos1);
        generarPDF("informe2.pdf", titulos2);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
        console.log("Conexión cerrada");
    }
}

main();
