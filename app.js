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

// Тест работоспособности
app.get('/', (request, response)=>{
    response.send("Это запрос в корень проекта.")
})

// Получение всех задач 
app.get('/tasks', (request, response)=>{
    db.all(`SELECT * FROM tasks`, (err, rows)=>{
        if(err) {
            console.log("Ошибка при получении списка задач: ", err.message)
            return response.status(500).json({error: "Ошибка при получении списка задач"})
        }
        
        // Преобразуем completed из INTEGER в Boolean
        const tasks = rows.map(row => ({
            ...row,
            completed: Boolean(row.completed)
        }))
        
        response.status(200).json(tasks)
    })
})

// Получение конкретной задачи
app.get('/tasks/:id', (request, response)=>{
    const taskId = request.params.id
    db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
        if(err) {
            console.log("Ошибка при получении задачи:", err.message)
            return response.status(500).json({error: "Ошибка при получении задачи"})
        }
        
        if(!row) {
            return response.status(404).json({error: "Задача не найдена"})
        }
        
        // Преобразуем completed в Boolean
        const task = {
            ...row,
            completed: Boolean(row.completed)
        }
        
        response.json(task)
    })
})

// Обновление задачи
app.put('/tasks/:id', (request, response)=>{
    const taskId = request.params.id
    const title = request.body.title
    const description = request.body.description
    const completed = request.body.completed
    
    if (!title || title.trim() === '') {
        return response.status(400).json({error: "Название задачи обязательно"})
    }
    
    // Подготавливаем данные для обновления
    let updateFields = []
    let values = []
    
    if (title !== undefined) {
        updateFields.push("title = ?")
        values.push(title)
    }
    
    if (description !== undefined) {
        updateFields.push("description = ?")
        values.push(description)
    }
    
    if (completed !== undefined) {
        updateFields.push("completed = ?")
        values.push(completed ? 1 : 0)
    }
    
    if (updateFields.length === 0) {
        return response.status(400).json({error: "Нет полей для обновления"})
    }
    
    values.push(taskId)
    
    db.run(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if(err) {
                console.error("Ошибка при обновлении задачи: ", err.message)
                return response.status(500).json({error: "Ошибка при обновлении задачи"})
            }
            
            if(this.changes === 0) {
                return response.status(404).json({error: "Задача не найдена"})
            }
            
            // Получаем обновленную задачу
            db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
                if(err) {
                    console.error("Ошибка при получении обновленной задачи: ", err.message)
                    return response.status(500).json({error: "Ошибка при получении обновленной задачи"})
                }
                
                // Преобразуем completed в Boolean перед отправкой
                const task = {
                    ...row,
                    completed: Boolean(row.completed)
                }
                
                console.log(`Задача обновлена: ID=${task.id}, title='${task.title}'`)
                response.json(task)
            })
        }
    )
})

// Удаление задачи
app.delete('/tasks/:id', (request, response)=>{
    const taskId = request.params.id
    console.log(`[DELETE] Получен запрос на удаление задачи с ID: ${taskId}`)
    
    db.run("DELETE FROM tasks WHERE id = ?", [taskId], function(err){
        if(err) {
            console.error(`[DELETE] Ошибка удаления задачи ID=${taskId}: ${err.message}`)
            return response.status(500).json({error: "Ошибка при удалении задачи"})
        }

        console.log(`[DELETE] Количество затронутых строк: ${this.changes}`)
        
        if(this.changes === 0) {
            console.log(`[DELETE] Задача с ID=${taskId} не найдена в базе данных`)
            return response.status(404).json({error: "Задача не найдена"})
        }
        
        console.log(`[DELETE] Задача с ID=${taskId} успешно удалена`)
        response.status(200).json({message: "Задача успешно удалена"})
    })
})

// Создание задачи
app.post('/tasks', (request, response)=>{
    const title = request.body.title
    const description = request.body.description
    
    if (!title || title.trim() === '') {
        return response.status(400).json({error: "Название задачи обязательно"})
    }
    
    db.run(
        "INSERT INTO tasks (title, description, completed) VALUES (?, ?, 0)", 
        [title, description], 
        function(err){
            if(err) {
                console.error("Ошибка при создании задачи: ", err.message)
                return response.status(500).json({error: "Ошибка при создании задачи"})
            }
            
            // Возвращаем созданную задачу с ID
            const newTask = {
                id: this.lastID,
                title: title,
                description: description,
                completed: false
            }
            
            console.log(`Задача создана: ID=${newTask.id}, title='${newTask.title}'`)
            response.status(201).json(newTask)
        }
    )
})

// Инициализация базы данных
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error("Ошибка создания таблицы:", err.message)
        } else {
            console.log("Таблица tasks готова к работе")
        }
    })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => { 
    console.log(`Сервер запущен на http://localhost:${PORT}`)
    console.log(`Для эмулятора Android используйте: http://10.0.2.2:${PORT}`)
})

// Принудительное закрытие соединения с БД при завершении процесса
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message)
        }
        console.log('Соединение с базой данных закрыто')
        process.exit(0)
    })
})