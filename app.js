'use strict'
const express = require("express")
const app = express()
const sqlite3 = require('sqlite3');
const path = require('path')

const dbPath = path.join(__dirname, 'database.db');

let db = new sqlite3.Database(dbPath, (err)=>{
    if(err) {
        console.log(`Error: ${err.message}`)
    } else {
        console.log("Соединение с БД установлено")
    }
})

app.use(express.json());

//Тест работоспособности
app.get('/', (request, response)=>{
    response.send("Это запрос в корень проекта.")
})

//Получение всех задач
app.get('/tasks', (request, response)=>{
    db.all(`SELECT * FROM tasks`, (err, rows)=>{
        if(err) {
            console.log("Ошибка при получении списка задач: ", err.message)
        }
        response.json(rows)
    })
})

//Получение конкретной задачи
app.get(`/tasks/:id`, (request, response)=>{
    const taskId = request.params.id
    db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
        if(err) {
            console.log("Ошибка при получении задачи:", err.message)
            return response.status(500).json({ 
                error: "Ошибка при получении задачи" 
            })
        }
        
        if(!row) {
            return response.status(404).json({ 
                error: "Задачи с таким id не существует" 
            })
        }
        
        response.json(row)
    })
})

//Создание задачи
app.post('/tasks', (request, response)=>{
    const title = request.body.title
    const description = request.body.description
    db.run(
        "INSERT INTO tasks (title, description, completed) VALUES (?, ?, 0)", 
        [title, description], 
        (err)=>{
            if(err) {
                console.error("Ошибка при создании задачи: ", err.message)
            }
            response.json({
                message: `Задача '${title}' создана`
            })
        }
    )
})

app.delete('/tasks/:id', (request, responce)=>{
    const taskId = request.params.id
    db.run("DELETE FROM tasks WHERE id = ?", [taskId], function(err){
        if(err) {
            console.error("Ошибка удаления задачи: ", err.message)
            return responce.status(500)
            // return responce.status(500).json({
            //     error: "Ошибка при удалении задачи"
            // })
        }

        if(this.changes === 0) {
            return responce.status(404)
            // return responce.status(404).json({ 
            //     error: `Задача с ID ${taskId} не найдена` 
            // })
        }
    })
})

app.listen(()=>{ console.log(`Сервер запущен на https://todoserver-37fr.onrender.com`) })

//Принудительное закрытие соединения с БД при завершении процесса
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message)
        }
        console.log('Соединение с базой данных закрыто')
        process.exit(0)
    })
})