const express = require('express')
const path = require('path')
const xss = require('xss')

const FoldersService = require('./folders-service')

const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = folder => ({
    id: folder.id,
    title: xss(folder.title),
    date_created: folder.date_created
})

foldersRouter
  .route('/')
  .get((req, res, next) => {
      const db = req.app.get('db')
      FoldersService.getAllFolders(db)
        .then(folders => {
            res.json(folders.map(serializeFolder))
        })
        .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
      const { title } = req.body
      const newFolder = {title}

      if (title == null) {
          return res.status(400).json({
              erron: { message: `Missing ${title} in request body.` }
          })
      }

      FoldersService.insertFolder(
        req.app.get('db'),
        newFolder
      )
        .then(folder => {
            res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                .json(serializeFolder(folder))
        })
        .catch(next)
  })

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
      FoldersService.getById(
          req.app.get('db'),
          req.params.folder_id
      )
        .then(folder => {
            if (!folder) {
                return res.status(400).json({
                    error: { message: `Folder does not exist.`}
                })
            }
            res.folder = folder
            next()
        })
        .catch(next) 
  })
  .get((req, res, next) => {
      res.json(serializeFolder(res.folder))
  })
  .delete((req, res, next) => {
      FoldersService.deleteFolder(
          req.app.get('db'),
          req.params.folder_id
      )
        .then(numberRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
      const { title } = req.body
      const folderUpdate = { title }

      if (!title) {
          return res.status(400).json({
              error: { message: 'Title required in request body.' }
          })
      }

      FoldersService.updateFolder(
          req.app.get('db'),
          req.params.folder_id,
          folderUpdate
      )
        .then(numberRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
  })

module.exports = foldersRouter