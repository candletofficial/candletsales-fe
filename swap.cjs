const fs = require('fs');
const p = 'd:/VScode/candletsales/candletsales-fe/src/pages/shop/ShopHome.jsx';
let content = fs.readFileSync(p, 'utf8');

const prodStart = content.indexOf('{/* BEGIN: ProductCollectionSection */}');
const ticketStart = content.indexOf('{/* BEGIN: TicketSpecialOfferSection */}');
const ticketEnd = content.indexOf('</section>', ticketStart) + 10;

const prodBlock = content.substring(prodStart, ticketStart);
const ticketBlock = content.substring(ticketStart, ticketEnd);

const beforeProd = content.substring(0, prodStart);
const afterTicket = content.substring(ticketEnd);

fs.writeFileSync(p, beforeProd + ticketBlock + '\n\n      ' + prodBlock.trimEnd() + '\n\n' + afterTicket.trimStart());
