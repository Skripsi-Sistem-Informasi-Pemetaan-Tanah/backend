import { db,pool } from './db.js'

export const database = async() => {
    try {
        await db.authenticate();
        console.log('Database terhubung')
    } catch (error) {
        console.log(`Database gagal terhubung, error: ${error.message}`)
    }
}