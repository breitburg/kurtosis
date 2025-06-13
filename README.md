# Kurtosis

[![Live Site](https://img.shields.io/badge/Live%20Site-blue)](https://kurtosis.breitburg.com)
[![GitHub Issues](https://img.shields.io/github/issues/breitburg/kurtosis)](https://github.com/breitburg/kurtosis/issues)

Super-snappy tool for power users of [KU Leuven Reservation Tool (KURT)](http://www.kuleuven.be/kurt) built by students. Easily view the availability of seats and rooms in Agora, Erasmushuis, CBA, EBIB and other KU Leuven libraries.

## Quick Start

### For Users

1. Visit [kurtosis.breitburg.com](https://kurtosis.breitburg.com)
2. Enter your R-number, U-number, or B-number (found on your student card as `Gebruikersnaam`)
3. Select a library and date (up to 7 days ahead)
4. Browse available time slots and select the ones you want
5. Click generated booking links to reserve on the official KURT system

**Requirements:**
- Valid KU Leuven R-number, U-number, or B-number
- Active KU Leuven account (student, staff, or guest)

### For Developers

```bash
# Clone the repository
git clone https://github.com/breitburg/kurtosis.git
cd kurtosis

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## Development

### Available Scripts

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run lint     # Run ESLint
bun run preview  # Preview production build
```

### Internationalization

The application supports multiple languages with **Dutch as the default**. Currently supported languages:

- 🇳🇱 **Nederlands** (Dutch) - Default
- 🇬🇧 **English**
- 🇫🇷 **Français** (French)

#### Adding a New Language

To add support for a new language:

1. **Create a translation file** in `src/i18n/locales/[lang-code].json`
   ```bash
   # Example: adding German
   cp src/i18n/locales/en.json src/i18n/locales/de.json
   ```

2. **Translate all text strings** in the new JSON file
   - Keep the same JSON structure
   - Translate only the values, not the keys
   - Use `{{variable}}` syntax for interpolated values

3. **Add the language to i18n configuration** in `src/i18n/i18n.js`:
   ```javascript
   import de from './locales/de.json';
   
   const resources = {
     // ... existing languages
     de: {
       translation: de
     }
   };
   ```

4. **Add the language option** to the switcher in `src/components/LanguageSwitcher.jsx`:
   ```javascript
   <option value="de">Deutsch</option>
   ```

5. **Add locale for date formatting** in `src/components/MainPage.jsx`:
   ```javascript
   let locale = 'en-US';
   if (i18n.language === 'nl') locale = 'nl-NL';
   else if (i18n.language === 'fr') locale = 'fr-FR';
   else if (i18n.language === 'de') locale = 'de-DE'; // Add this line
   ```

The language preference is automatically saved to localStorage and will persist across browser sessions.

### Working with Claude Code

This repository includes a `CLAUDE.md` file with detailed guidance for [Claude Code](https://claude.ai/code) when working with this codebase.

## Legal & Disclaimer

**Not affiliated with KU Leuven** - This is an independent student project.

While we've shared this tool with KURT staff and received no objections, it is not officially approved or endorsed by KU Leuven. Use responsibly and don't abuse the system. We're not responsible for any consequences of using this tool.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Email**: [kurtosis@breitburg.com](mailto:kurtosis@breitburg.com)
- **Issues**: [GitHub Issues](https://github.com/breitburg/kurtosis/issues/new)

## License

This project is open source. See the repository for license details.