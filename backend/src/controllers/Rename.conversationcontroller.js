// Add this to your chat.controller.js file

import pool from '../config/database.js' // Adjust path as needed

/**
 * -----------------------------
 * RENAME CONVERSATION
 * -----------------------------
 * Updates the title of a conversation
 */
export const renameConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { title } = req.body
    const userId = req.user.id

    // Validate title
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        error: 'Title is required',
        message: 'Please provide a valid title for the conversation'
      })
    }

    // Trim and validate length
    const trimmedTitle = title.trim()
    if (trimmedTitle.length > 200) {
      return res.status(400).json({ 
        error: 'Title too long',
        message: 'Title must be less than 200 characters'
      })
    }

    // Update conversation title
    const result = await pool.query(
      `UPDATE conversations 
       SET title = $1, updated_at = NOW() 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, title, first_message, created_at, updated_at`,
      [trimmedTitle, conversationId, userId]
    )

    // Check if conversation was found and updated
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Conversation not found',
        message: 'The conversation does not exist or you do not have permission to rename it'
      })
    }

    console.log(`✅ Conversation renamed: ${conversationId} -> "${trimmedTitle}"`)

    res.json({ 
      success: true, 
      conversation: result.rows[0],
      message: 'Conversation renamed successfully'
    })
  } catch (error) {
    console.error('❌ Rename conversation error:', error)
    res.status(500).json({ 
      error: 'Failed to rename conversation',
      message: 'An error occurred while renaming the conversation'
    })
  }
}