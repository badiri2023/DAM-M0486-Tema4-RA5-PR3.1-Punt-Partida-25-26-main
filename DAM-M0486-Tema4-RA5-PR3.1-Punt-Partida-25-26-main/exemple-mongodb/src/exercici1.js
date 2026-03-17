const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const xml2js = require('xml2js');
const he = require('he');
const winston = require('winston');
require('dotenv').config();

// Ruta al archivo XML
const xmlFilePath = path.join(__dirname, '../../data/Posts.xml');

// generar logs
const logsDir = path.join(__dirname, '../../data/logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} - ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, "exercici1.log")})
  ]
});

// Redefinir console.log para que también escriba en el log
const originalLog = console.log;
console.log = function (...args) {
  originalLog(...args);
  logger.info(args.join(" "));
};

// funcion para leer y parsear XML
async function parseXMLFile(filePath) {
  try {
    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true
    });

    return new Promise((resolve, reject) => {
      parser.parseString(xmlData, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  } catch (error) {
    console.log('Error leyendo el XML:', error);
    throw error;
  }
}


function processQuestionsData(preguntas) {
  return preguntas.map(p => ({
    question: {
      Id: p.Id,
      PostTypeId: p.PostTypeId,
      AcceptedAnswerId: p.AcceptedAnswerId,
      CreationDate: p.CreationDate,
      Score: p.Score,
      ViewCount: p.ViewCount,
      Body: p.Body ? he.decode(p.Body) : "",
      OwnerUserId: p.OwnerUserId,
      LastActivityDate: p.LastActivityDate,
      Title: p.Title ? he.decode(p.Title) : "",
      Tags: p.Tags ? he.decode(p.Tags) : "",
      AnswerCount: p.AnswerCount,
      CommentCount: p.CommentCount,
      ContentLicense: p.ContentLicense
    }
  }));
}


// Poner los datos dentro de MongoDB
async function loadDataToMongoDB(preguntasProcesadas) {
  const uri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connectat a MongoDB');

    const database = client.db('chess_db');
    const collection = database.collection('questions');
    // borramos lo que haya siempre antes de insertar para evitar duplicados o errores
    console.log("Eliminant dades existents...");
    await collection.deleteMany({});

    console.log("Inserint dades a MongoDB...");
    const result = await collection.insertMany(preguntasProcesadas);

    console.log(`${result.insertedCount} documents inserits correctament.`);
  } catch (error) {
    console.log("Error carregant les dades a MongoDB:", error);
  } finally {
    await client.close();
    console.log('Conexio Tancada');
  }
}

async function main() {
  console.log("Exercici 1: ");
  const xml = await parseXMLFile(xmlFilePath);
  const posts = xml.posts.row;

  console.log("Posts trobats: ", posts.length);
  const preguntas = posts.filter(p => p.PostTypeId === "1");
  console.log("Total de preguntes: ", preguntas.length);
  const preguntasOrdenadas = preguntas.sort((a, b) =>
    (parseInt(b.ViewCount) || 0) - (parseInt(a.ViewCount) || 0)
  );

  const topPreguntas = preguntasOrdenadas.slice(0, 10000);
  console.log("Preguntes seleccionades:", topPreguntas.length);
  const preguntasProcesadas = processQuestionsData(topPreguntas);

  console.log("Estructura de dadas:");
  // ajustamos para que no nos escriba [object Object]
  console.log(JSON.stringify(preguntasProcesadas[0], null, 2));
  await loadDataToMongoDB(preguntasProcesadas);
  
}

main();
