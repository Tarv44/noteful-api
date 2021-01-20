const express = require('express')
const path = require('path')
const xss = require('xss')

const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
    id: note.id,
    title: xss(note.title),
    date_created: note.date_created,
    content: xss(note.content),
    folder: note.folder
})

notesRouter
  .route('/')
  .get((req, res, next) => {
      const db = req.app.get('db')
      NotesService.getAllNotes(db)
        .then(notes => {
            res.json(notes.map(serializeNote))
        })
        .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
      const { title, content, folder } = req.body
      const newNote = {title, folder}

      for (const [key, value] of Object.entries(newNote)) {
        if (value == null) {
            return res.status(400).json({
                error: { message: `Missing ${key} in request body.` }
            })
        }
      }
      
      newNote.content = content

      NotesService.insertNote(
        req.app.get('db'),
        newNote
      )
        .then(note => {
            res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${note.id}`))
                .json(serializeNote(note))
        })
        .catch(next)
  })

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
      NotesService.getById(
          req.app.get('db'),
          req.params.note_id
      )
        .then(note => {
            if (!note) {
                return res.status(400).json({
                    error: { message: `note does not exist.`}
                })
            }
            res.note = note
            next()
        })
        .catch(next) 
  })
  .get((req, res, next) => {
      res.json(serializeNote(res.note))
  })
  .delete((req, res, next) => {
      NotesService.deleteNote(
          req.app.get('db'),
          req.params.note_id
      )
        .then(numberRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
      const { title, content, folder } = req.body
      const noteUpdate = { title, content, folder }

      const numberOfValues = Object.values(noteUpdate).filter(Boolean).length
      if (numberOfValues === 0) {
          return res.status(400).json({
              error: { message: `Request body must contain either 'title', 'content' or 'folder'` }
          })
      }

      NotesService.updateNote(
          req.app.get('db'),
          req.params.note_id,
          noteUpdate
      )
        .then(numberRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
  })

module.exports = notesRouter