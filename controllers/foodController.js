const { Food } = require('../models');

exports.create = async (req,res)=>{
  try{
    const food = await Food.create(req.body);
    res.status(201).json(food);
  }catch(e){ console.error(e); res.status(400).json({error:'Failed to create food'}); }
};

exports.list = async (req,res)=>{
  try{ res.json(await Food.findAll()); }
  catch(e){ console.error(e); res.status(500).json({error:'Failed to fetch foods'}); }
};

exports.get = async (req,res)=>{
  try{
    const food = await Food.findByPk(req.params.id);
    if(!food) return res.status(404).json({error:'Not found'});
    res.json(food);
  }catch(e){ console.error(e); res.status(500).json({error:'Failed to fetch food'}); }
};

exports.update = async (req,res)=>{
  try{
    const food = await Food.findByPk(req.params.id);
    if(!food) return res.status(404).json({error:'Not found'});
    await food.update(req.body);
    res.json(food);
  }catch(e){ console.error(e); res.status(400).json({error:'Update failed'}); }
};

exports.remove = async (req,res)=>{
  try{
    const food = await Food.findByPk(req.params.id);
    if(!food) return res.status(404).json({error:'Not found'});
    await food.destroy();
    res.json({message:'Deleted'});
  }catch(e){ console.error(e); res.status(400).json({error:'Delete failed'}); }
};
