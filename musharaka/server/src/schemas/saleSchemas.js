const { z } = require('zod')

const saleSchema = z.object({
  branch_id:         z.string().uuid({ message: 'يرجى اختيار الفرع' }),
  input_type:        z.enum(['daily','monthly','range'], { message: 'نوع الإدخال غير صالح' }),
  amount:            z.number({ message: 'المبلغ مطلوب' }).positive({ message: 'يجب أن يكون المبلغ أكبر من صفر' }),
  sale_date:         z.string().optional(),
  month:             z.number().min(1).max(12).optional(),
  year:              z.number().min(2020).max(2030).optional(),
  period_start_date: z.string().optional(),
  period_end_date:   z.string().optional(),
  invoice_number:    z.string().optional(),
  notes:             z.string().optional(),
})

module.exports = { saleSchema }
