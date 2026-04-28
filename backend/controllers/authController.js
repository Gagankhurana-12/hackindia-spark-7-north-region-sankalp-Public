const Parent = require('../models/Parent');
const Child = require('../models/Child');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to generate a 6-character alphanumeric link code
const generateLinkCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

exports.registerAdult = async (req, res) => {
    try {
        const { parentData, preferences, childrenData } = req.body;

        // Check if Parent exists
        const existingParent = await Parent.findOne({ email: parentData.email });
        if (existingParent) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(parentData.password, salt);

        // Create Parent entry (without children mapping initially)
        const parent = new Parent({
            name: parentData.name,
            email: parentData.email,
            password: hashedPassword,
            phone: parentData.phone,
            preferences: {
                mode: preferences?.mode || 'balanced',
                monitorActivity: preferences?.monitorActivity !== undefined ? preferences.monitorActivity : true,
                aiActsAsParent: preferences?.aiActsAsParent !== undefined ? preferences.aiActsAsParent : true,
            }
        });

        const createdParent = await parent.save();
        const createdChildren = [];

        // Parse and create Children with auto-generated linking codes
        for (const childData of childrenData) {
             let uniqueCode = generateLinkCode();
             // Just enforce uniqueness practically; chances of collision are low but looping ensures safety
             while(await Child.findOne({ linkCode: uniqueCode })) {
                 uniqueCode = generateLinkCode();
             }

             const child = new Child({
                 name: childData.name,
                 age: childData.age,
                 interests: childData.interests,
                 mode: childData.mode || 'balanced',
                 language: childData.language || 'english',
                 linkCode: uniqueCode,
                 parentId: createdParent._id
             });
             const savedChild = await child.save();
             createdChildren.push(savedChild);
        }

        // Add children references to parent doc
        createdParent.children = createdChildren.map(c => c._id);
        await createdParent.save();

        // Sign JWT
        const token = jwt.sign(
            { id: createdParent._id }, 
            process.env.JWT_SECRET || 'fallback_secret', 
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'Onboarding completed successfully',
            token,
            parent: {
                id: createdParent._id,
                name: createdParent.name,
                email: createdParent.email,
                preferences: createdParent.preferences
            },
            childrenAccounts: createdChildren.map(c => ({
                id: c._id,
                name: c.name,
                linkCode: c.linkCode
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during onboarding', error: error.message });
    }
};

exports.loginAdult = async (req, res) => {
    try {
        const { email, password } = req.body;

        const parent = await Parent.findOne({ email }).select('+password');
        if (!parent) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, parent.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: parent._id, parentId: parent._id, name: parent.name, role: 'parent' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            parent: {
                id: parent._id,
                name: parent.name,
                email: parent.email,
                preferences: parent.preferences,
                children: parent.children
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

exports.loginChild = async (req, res) => {
    try {
        const { linkCode } = req.body;

        if (!linkCode) {
            return res.status(400).json({ message: 'Link code is required' });
        }

        const child = await Child.findOne({ linkCode });
        if (!child) {
            return res.status(404).json({ message: 'Invalid link code' });
        }

        const token = jwt.sign(
            { id: child._id, role: 'child', parentId: child.parentId }, 
            process.env.JWT_SECRET || 'fallback_secret', 
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Child login successful',
            token,
            child: {
                id: child._id,
                name: child.name,
                age: child.age,
                interests: child.interests,
                mode: child.mode,
                level: child.level,
                xp: child.xp
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during child login', error: error.message });
    }
};
exports.getParentProfile = async (req, res) => {
    try {
        const parent = await Parent.findById(req.parent._id).populate('children');
        if (!parent) return res.status(404).json({ message: 'Parent not found' });
        
        res.json({
            id: parent._id,
            name: parent.name,
            email: parent.email,
            preferences: parent.preferences,
            children: parent.children
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error retrieving profile' });
    }
};

exports.addChild = async (req, res) => {
    try {
        const { name, age, interests, mode, language } = req.body;

        let uniqueCode = generateLinkCode();
        while(await Child.findOne({ linkCode: uniqueCode })) {
            uniqueCode = generateLinkCode();
        }

        const child = new Child({
            name,
            age,
            interests: interests ? (Array.isArray(interests) ? interests : interests.split(',').map(i => i.trim()).filter(Boolean)) : [],
            mode: mode || 'balanced',
            language: language || 'english',
            linkCode: uniqueCode,
            parentId: req.parent._id
        });
        
        const savedChild = await child.save();
        
        req.parent.children.push(savedChild._id);
        await req.parent.save();

        res.status(201).json({
            message: 'Child added successfully',
            child: savedChild
        });
    } catch (error) {
        res.status(500).json({ message: 'Error adding child: ' + error.message });
    }
};

exports.getChildProfile = async (req, res) => {
    try {
        const child = req.child;
        return res.json({
            id: child._id,
            name: child.name,
            age: child.age,
            interests: child.interests || [],
            mode: child.mode,
            level: child.level,
            xp: child.xp,
            parentId: child.parentId,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error retrieving child profile' });
    }
};
