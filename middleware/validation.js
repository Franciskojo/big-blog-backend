export const validateRegistration = (req, res, next) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    next();
};

export const validatePost = (req, res, next) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    if (title.length < 3) {
        return res.status(400).json({ error: 'Title must be at least 3 characters long' });
    }

    if (content.length < 10) {
        return res.status(400).json({ error: 'Content must be at least 10 characters long' });
    }

    next();
};

export const validateComment = (req, res, next) => {
    const { content, postId } = req.body;

    if (!content || !postId) {
        return res.status(400).json({ error: 'Content and postId are required' });
    }

    if (content.length < 1) {
        return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    next();
};
