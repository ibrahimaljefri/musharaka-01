const { z } = require('zod')

const importRowSchema = z.object({
  input_type:        z.enum(['daily','monthly','range']),
  sale_date:         z.string().optional(),
  month:             z.coerce.number().min(1).max(12).optional(),
  year:              z.coerce.number().optional(),
  period_start_date: z.string().optional(),
  period_end_date:   z.string().optional(),
  amount:            z.coerce.number().positive({ message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  invoice_number:    z.string().optional(),
  notes:             z.string().optional(),
})

module.exports = { importRowSchema }
