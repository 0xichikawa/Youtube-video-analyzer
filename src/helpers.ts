import fs from 'node:fs'

export function addRecipeTitles(data: any, filePath: string) {
  let json = []
  
  try {
    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath, 'utf8')
      if (file) {
        json = JSON.parse(file)
      }
    }
  } catch (error) {
    json = []
  }

  json.push(data)

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
}

export function getRecipeTitles(filePath: string) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  return json as {
    mainDish: string
    sideDish: string
    mealType: string
    tasteType: string
    recipeTitles: string
    userCountry: string
    userLanguage: string
  }[]
}

export function addRecipe(data: any, filePath: string) {
  let json = []

  try {
    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath, 'utf8')
      if (file) {
        json = JSON.parse(file)
      }
    }
  } catch (error) {
    json = []
  }

  json.push(data)

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
}
