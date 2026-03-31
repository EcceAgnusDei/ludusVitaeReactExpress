//logique utilisée seulement par tsconfig.json
declare global {
  namespace Express {
    interface Request {
      userId?: string; //déclare que req peut avoir une propriété userId de type string
    }
  }
}

export {};
