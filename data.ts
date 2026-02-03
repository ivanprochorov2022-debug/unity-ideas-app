
import { GameIdea, Difficulty, Genre } from './types';

export const GAME_IDEAS: GameIdea[] = [
  // --- EASY (6 Игр для старта) ---
  {
    id: 1,
    title: "Бесконечный Куб (Cube Runner)",
    description: "Простой раннер, где кубик движется вперед по процедурно генерируемой трассе.",
    objective: "Уклоняться от препятствий, нажимая влево/вправо. С каждой секундой скорость растет.",
    difficulty: Difficulty.EASY,
    genre: Genre.ARCADE
  },
  {
    id: 2,
    title: "Кликер Печенек (Cookie Clicker Clone)",
    description: "Классический кликер. Нажимаешь на объект, получаешь валюту, покупаешь авто-клики.",
    objective: "Накопить миллион очков, купить все улучшения и создать визуальные эффекты клика.",
    difficulty: Difficulty.EASY,
    genre: Genre.IDLE
  },
  {
    id: 7,
    title: "Космо-Арканоид (Breakout)",
    description: "Платформа внизу отбивает шарик, разбивая кирпичи сверху.",
    objective: "Очистить уровень от кирпичей, ловя бонусы (расширение биты, огненный шар).",
    difficulty: Difficulty.EASY,
    genre: Genre.ARCADE
  },
  {
    id: 8,
    title: "Мемори Карты (Memory Match)",
    description: "Сетка карт рубашкой вверх. Нужно искать пары.",
    objective: "Найти все пары за наименьшее количество ходов или на время.",
    difficulty: Difficulty.EASY,
    genre: Genre.PUZZLE
  },
  {
    id: 16,
    title: "Саймон Говорит (Simon Says)",
    description: "4 цветные кнопки, которые загораются в определенном порядке.",
    objective: "Повторить последовательность нажатий, которая удлиняется с каждым раундом.",
    difficulty: Difficulty.EASY,
    genre: Genre.PUZZLE
  },
  {
    id: 18,
    title: "Флэппи Берд (Flappy Clone)",
    description: "Птичка летит вправо, гравитация тянет вниз, клик подбрасывает.",
    objective: "Пролететь между трубами как можно дальше.",
    difficulty: Difficulty.EASY,
    genre: Genre.ARCADE
  },

  // --- MEDIUM (3 Игры для закрепления) ---
  {
    id: 3,
    title: "Защита Башни (Tower Defense Lite)",
    description: "Упрощенная версия TD. Враги идут по одной линии.",
    objective: "Расставить башни вдоль пути, чтобы уничтожить врагов до того, как они дойдут до базы.",
    difficulty: Difficulty.MEDIUM,
    genre: Genre.STRATEGY
  },
  {
    id: 6,
    title: "Зомби Тир (Top-Down Shooter)",
    description: "Вид сверху. Игрок в центре, зомби идут со всех сторон.",
    objective: "Выжить как можно дольше, стреляя и поворачиваясь мышкой.",
    difficulty: Difficulty.MEDIUM,
    genre: Genre.ACTION
  },
  {
    id: 20,
    title: "Регулировщик (Traffic Control)",
    description: "Перекресток, машины едут с разных сторон.",
    objective: "Переключать светофоры, чтобы машины не столкнулись и не образовалась пробка.",
    difficulty: Difficulty.MEDIUM,
    genre: Genre.STRATEGY
  }
];
